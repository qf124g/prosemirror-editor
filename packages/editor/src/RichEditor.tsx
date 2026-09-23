import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import type { Plugin, Command } from 'prosemirror-state'
import { EditorManager } from './manager/EditorManager'
import { builtinModules } from './modules'
import { createEditorState } from './core/createView'
import { toPlainText } from './core/serialization'
import { createSlashPlugin, slashPluginKey, filterSlashItems, emptySlashState } from './plugins/slashPlugin'
import { createPlaceholderPlugin } from './plugins/placeholder'
import { Toolbar } from './components/Toolbar'
import { SlashMenu } from './components/SlashMenu'
import { AISummaryPanel } from './components/AISummaryPanel'
import type {
  EditorAPI,
  EditorModule,
  ResourceResolver,
  SlashItemConfig,
  ToolbarItemConfig,
  UploadMedia,
} from './modules/types'
import './RichEditor.css'

export interface RichEditorHandle {
  view: EditorView
  manager: EditorManager
  commands: Record<string, Command>
}

export interface RichEditorProps {
  doc?: any
  initialHTML?: string
  onChange?: (doc: any) => void
  onReady?: (handle: RichEditorHandle) => void
  resourceResolver?: ResourceResolver
  uploadMedia?: UploadMedia
  modules?: EditorModule[]
  plugins?: Plugin[]
  toolbarItems?: ToolbarItemConfig[]
  slashItems?: SlashItemConfig[]
  aiSummary?: (text: string) => Promise<string>
  showToolbar?: boolean
  editable?: boolean
  placeholder?: string
  className?: string
}

// 富文本编辑器主组件
export function RichEditor(props: RichEditorProps) {
  const {
    doc,
    initialHTML,
    onChange,
    onReady,
    resourceResolver,
    uploadMedia,
    modules,
    plugins = [],
    toolbarItems = [],
    slashItems = [],
    aiSummary,
    showToolbar = true,
    editable = true,
    placeholder = '输入 / 试试吧',
    className,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const managerRef = useRef<EditorManager | null>(null)
  const apiRef = useRef<EditorAPI>(null as unknown as EditorAPI)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const aiSummaryRef = useRef(aiSummary)
  aiSummaryRef.current = aiSummary

  const [view, setView] = useState<EditorView | null>(null)
  const [, setTick] = useState(0)
  const [summary, setSummary] = useState({ open: false, loading: false, text: '' })

  const runAISummary = useCallback(async () => {
    const v = viewRef.current
    if (!v) return
    const text = toPlainText(v.state.doc).trim()
    if (!text) {
      setSummary({ open: true, loading: false, text: '暂无内容可摘要' })
      return
    }
    const fn = aiSummaryRef.current
    if (!fn) {
      setSummary({ open: true, loading: false, text: '未配置 AI 摘要接口' })
      return
    }
    setSummary({ open: true, loading: true, text: '' })
    try {
      const result = await fn(text)
      setSummary({ open: true, loading: false, text: result || '暂无摘要' })
    } catch (err) {
      setSummary({ open: true, loading: false, text: '摘要生成失败：' + (err as Error).message })
    }
  }, [])

  const handleSelect = useCallback((item: SlashItemConfig) => {
    const v = viewRef.current
    const manager = managerRef.current
    if (!v || !manager) return
    const st = slashPluginKey.getState(v.state)
    if (!st || !st.active) return
    const to = v.state.selection.from
    if (to >= st.from) v.dispatch(v.state.tr.delete(st.from, to).setMeta(slashPluginKey, { close: true }))
    else v.dispatch(v.state.tr.setMeta(slashPluginKey, { close: true }))
    if (item.command && manager.commands[item.command]) manager.commands[item.command]!(v.state, v.dispatch)
    else if (item.action) item.action(apiRef.current)
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const manager = new EditorManager([...builtinModules, ...(modules || [])], { resourceResolver, uploadMedia })
    manager.init()
    toolbarItems.forEach((t) => manager.addToolbarItem(t))
    slashItems.forEach((s) => manager.addSlashItem(s))
    managerRef.current = manager

    const slashPlugin = createSlashPlugin({
      getItems: () => manager.slashItems,
      onSelect: (item) => handleSelect(item),
    })

    // 模块自定义 keymap 优先于 baseKeymap 执行（如列表的 Enter/Tab 缩进需覆盖默认行为）
    const allPlugins: Plugin[] = [...manager.plugins, keymap(baseKeymap), slashPlugin, createPlaceholderPlugin(), ...plugins]

    const state = createEditorState({ schema: manager.schema, doc, initialHTML, plugins: allPlugins })

    const editorView = new EditorView(element, {
      state,
      nodeViews: manager.nodeViews,
      editable: () => editable !== false,
      attributes: { class: 'full-editor-content', 'data-placeholder': placeholder || '' },
      dispatchTransaction: function (this: EditorView, tr) {
        const next = this.state.apply(tr)
        this.updateState(next)
        if (tr.docChanged) {
          manager.emit('update', next.doc.toJSON())
          onChangeRef.current?.(next.doc.toJSON())
        }
        if (tr.selectionSet) manager.emit('selectionChange', next)
        setTick((t) => t + 1)
      },
    })

    viewRef.current = editorView
    manager.view = editorView
    apiRef.current = { view: editorView, commands: manager.commands, uploadMedia, runAISummary }
    setView(editorView)
    onReady?.({ view: editorView, manager, commands: manager.commands })

    const offToolbar = manager.on('toolbarChange', () => setTick((t) => t + 1))
    const offSlash = manager.on('slashChange', () => setTick((t) => t + 1))

    return () => {
      offToolbar()
      offSlash()
      editorView.destroy()
      viewRef.current = null
      managerRef.current = null
      setView(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const manager = managerRef.current
  const slashState = view ? slashPluginKey.getState(view.state) ?? emptySlashState : emptySlashState
  const filtered = filterSlashItems(manager?.slashItems ?? [], slashState.query)

  // 将 view.coordsAtPos 的视口坐标换算为相对滚动容器 .full-editor-body 的坐标，
  // 保证斜杠菜单正确定位在光标下方（coords 为视口坐标，绝对定位需减去容器偏移）
  const position = (() => {
    if (!slashState.active || !view) return null
    const coords = view.coordsAtPos(slashState.from)
    const body = containerRef.current?.parentElement
    if (!body) return { left: coords.left, top: coords.bottom }
    const rect = body.getBoundingClientRect()
    return { left: coords.left - rect.left, top: coords.bottom - rect.top }
  })()

  return (
    <div className={`full-editor ${className || ''}`}>
      {showToolbar && view && manager ? (
        <Toolbar state={view.state} api={apiRef.current} items={manager.toolbarItems} />
      ) : null}
      <div className="full-editor-body">
        <div ref={containerRef} className="full-editor-mount" />
        <SlashMenu
          items={filtered}
          index={slashState.index}
          query={slashState.query}
          position={position}
          onPick={handleSelect}
          onHover={(index) => {
            if (view && slashPluginKey.getState(view.state)?.active) {
              view.dispatch(view.state.tr.setMeta(slashPluginKey, { index }))
            }
          }}
        />
      </div>
      <AISummaryPanel
        open={summary.open}
        loading={summary.loading}
        summary={summary.text}
        onClose={() => setSummary((s) => ({ ...s, open: false }))}
      />
    </div>
  )
}

export default RichEditor