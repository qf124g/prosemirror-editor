import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { createGhostTextPlugin } from './plugins/ghostText'
import { createSuggestionPlugin, requestSuggestion } from './plugins/suggestionPlugin'
import { createDiffPlugin, requestDiff } from './plugins/diffPlugin'
import { Toolbar } from './components/Toolbar'
import { SlashMenu } from './components/SlashMenu'
import { AISummaryPanel } from './components/AISummaryPanel'
import type {
  EditorAPI,
  EditorModule,
  MediaResourceSource,
  SlashItemConfig,
  ToolbarItemConfig,
  UploadMedia,
} from './modules/types'
import './RichEditor.css'

export interface RichEditorHandle {
  view: EditorView
  manager: EditorManager
  commands: Record<string, Command>
  runAIRewrite: () => void
}

// AI 协同写作模式：ghost 内联续写 / suggest 批注建议 / diff 差异视图
export type AICollabMode = 'ghost' | 'suggest' | 'diff'

export interface RichEditorProps {
  doc?: any
  initialHTML?: string
  onChange?: (doc: any) => void
  onReady?: (handle: RichEditorHandle) => void
  uploadMedia?: UploadMedia
  mediaSource?: MediaResourceSource
  modules?: EditorModule[]
  plugins?: Plugin[]
  toolbarItems?: ToolbarItemConfig[]
  slashItems?: SlashItemConfig[]
  aiSummary?: (text: string) => Promise<string>
  aiComplete?: (context: string, signal?: AbortSignal) => Promise<string>
  aiMode?: AICollabMode
  aiRewrite?: (text: string, signal?: AbortSignal) => Promise<string>
  showToolbar?: boolean
  editable?: boolean
  placeholder?: string
  className?: string
}

// 斜杠菜单固定宽度与最大高度、与光标/边界的间距
const SLASH_MENU_WIDTH = 280
const SLASH_MENU_MAX_HEIGHT = 380
const SLASH_MENU_GAP = 4

interface SlashPosition {
  left: number
  top: number
}

// 根据光标位置与滚动容器可视区域，计算斜杠菜单展示位置：
// 默认在光标下方，下方空间不足时翻转到上方；上下均不足则返回 'close' 关闭菜单
function computeSlashPosition(
  coords: { left: number; top: number; bottom: number },
  rect: DOMRect,
  menuSize: { width: number; height: number } | null,
): SlashPosition | 'close' {
  const menuWidth = menuSize?.width ?? SLASH_MENU_WIDTH
  const menuHeight = menuSize?.height ?? SLASH_MENU_MAX_HEIGHT

  // 水平方向：优先对齐光标左边缘，超出可视区则向内收
  let left = coords.left - rect.left
  const maxLeft = rect.width - menuWidth - SLASH_MENU_GAP
  left = Math.max(SLASH_MENU_GAP, Math.min(left, maxLeft))

  const spaceBelow = rect.bottom - coords.bottom
  const spaceAbove = coords.top - rect.top

  if (spaceBelow >= menuHeight + SLASH_MENU_GAP) {
    return { left, top: coords.bottom - rect.top + SLASH_MENU_GAP }
  }
  if (spaceAbove >= menuHeight + SLASH_MENU_GAP) {
    return { left, top: coords.top - rect.top - menuHeight - SLASH_MENU_GAP }
  }
  return 'close'
}

// 富文本编辑器主组件
export function RichEditor(props: RichEditorProps) {
  const {
    doc,
    initialHTML,
    onChange,
    onReady,
    uploadMedia,
    mediaSource,
    modules,
    plugins = [],
    toolbarItems = [],
    slashItems = [],
    aiSummary,
    aiComplete,
    aiMode = 'ghost',
    aiRewrite,
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
  const aiCompleteRef = useRef(aiComplete)
  aiCompleteRef.current = aiComplete
  const aiRewriteRef = useRef(aiRewrite)
  aiRewriteRef.current = aiRewrite
  const lastDocRef = useRef<any>(null)
  const aiRewriteTriggerRef = useRef<() => void>(() => {})

  const [view, setView] = useState<EditorView | null>(null)
  const [, setTick] = useState(0)
  const [summary, setSummary] = useState({ open: false, loading: false, text: '' })
  const [menuSize, setMenuSize] = useState<{ width: number; height: number } | null>(null)

  const handleMenuSizeChange = useCallback((size: { width: number; height: number } | null) => {
    setMenuSize(size)
  }, [])

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

  const runAIRewrite = useCallback(() => {
    aiRewriteTriggerRef.current()
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

    const manager = new EditorManager([...builtinModules, ...(modules || [])], { uploadMedia, mediaSource })
    manager.init()
    toolbarItems.forEach((t) => manager.addToolbarItem(t))
    slashItems.forEach((s) => manager.addSlashItem(s))
    managerRef.current = manager

    const slashPlugin = createSlashPlugin({
      getItems: () => manager.slashItems,
      onSelect: (item) => handleSelect(item),
    })

    // 根据 aiMode 选择不同的 AI 协同插件，三者互斥注册，便于切换对比效果
    const aiCollabPlugin = ((): Plugin => {
      if (aiMode === 'suggest') {
        return createSuggestionPlugin({
          getSuggestion: (text, signal) => {
            const fn = aiRewriteRef.current
            return fn ? fn(text, signal) : Promise.resolve('')
          },
        })
      }
      if (aiMode === 'diff') {
        return createDiffPlugin({
          getSuggestion: (text, signal) => {
            const fn = aiRewriteRef.current
            return fn ? fn(text, signal) : Promise.resolve('')
          },
        })
      }
      // ghost：置顶以便 Tab 接受建议优先于列表缩进等已有快捷键
      return createGhostTextPlugin({
        async complete(context, signal) {
          const fn = aiCompleteRef.current
          return fn ? await fn(context, signal) : ''
        },
        enabled: (state) => {
          if (!aiCompleteRef.current) return false
          if (slashPluginKey.getState(state)?.active) return false
          return !!state.selection.$from.parent.isTextblock
        },
      })
    })()

    // 模块自定义 keymap 优先于 baseKeymap 执行（如列表的 Enter/Tab 缩进需覆盖默认行为）
    const allPlugins: Plugin[] = [aiCollabPlugin, ...manager.plugins, keymap(baseKeymap), slashPlugin, createPlaceholderPlugin(), ...plugins]

    // 切换 aiMode 会重建编辑器，用上一份文档 JSON 续接内容，避免内容被重置
    const state = createEditorState({
      schema: manager.schema,
      doc: lastDocRef.current ?? doc,
      initialHTML: lastDocRef.current ? undefined : initialHTML,
      plugins: allPlugins,
    })

    const editorView = new EditorView(element, {
      state,
      nodeViews: manager.nodeViews,
      editable: () => editable !== false,
      attributes: { class: 'full-editor-content', 'data-placeholder': placeholder || '' },
      dispatchTransaction: function (this: EditorView, tr) {
        const next = this.state.apply(tr)
        this.updateState(next)
        if (tr.docChanged) {
          lastDocRef.current = next.doc.toJSON()
          manager.emit('update', next.doc.toJSON())
          onChangeRef.current?.(next.doc.toJSON())
        }
        if (tr.selectionSet) manager.emit('selectionChange', next)
        setTick((t) => t + 1)
      },
    })

    viewRef.current = editorView
    manager.view = editorView

    // 依据当前模式，把 AI 改写触发动作接到对应插件（ghost 模式无选区改写）
    aiRewriteTriggerRef.current = () => {
      const v = viewRef.current
      const fn = aiRewriteRef.current
      if (!v || !fn) return
      if (aiMode === 'suggest') void requestSuggestion(v, fn)
      else if (aiMode === 'diff') void requestDiff(v, fn)
    }

    apiRef.current = { view: editorView, commands: manager.commands, uploadMedia, runAISummary, runAIRewrite }
    setView(editorView)
    onReady?.({ view: editorView, manager, commands: manager.commands, runAIRewrite })

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
  }, [aiMode])

  const manager = managerRef.current
  const slashState = view ? slashPluginKey.getState(view.state) ?? emptySlashState : emptySlashState
  const filtered = filterSlashItems(manager?.slashItems ?? [], slashState.query)

  // 将 view.coordsAtPos 的视口坐标换算为相对滚动容器 .full-editor-body 的坐标，
  // 并根据可视空间动态翻转（优先下方，不足翻上方）或返回 'close' 关闭菜单
  const slashPlacement: SlashPosition | 'close' | null = (() => {
    if (!slashState.active || !view) return null
    const body = containerRef.current?.parentElement
    if (!body) return null
    const coords = view.coordsAtPos(slashState.from)
    const rect = body.getBoundingClientRect()
    const result = computeSlashPosition(coords, rect, menuSize)
    // 未测得菜单尺寸前不关停：先按光标下方预估位置渲染，待测量后再做翻转/关闭判定
    if (result === 'close' && !menuSize) {
      return { left: coords.left - rect.left, top: coords.bottom - rect.top + SLASH_MENU_GAP }
    }
    return result
  })()

  const position = slashPlacement && slashPlacement !== 'close' ? slashPlacement : null

  // 上下空间均不足以完整展示菜单时，关闭 / 菜单，保证页面可视
  const shouldClose = slashPlacement === 'close'
  useLayoutEffect(() => {
    if (shouldClose && view && slashPluginKey.getState(view.state)?.active) {
      view.dispatch(view.state.tr.setMeta(slashPluginKey, { close: true }))
    }
  }, [shouldClose, view])

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
          onSizeChange={handleMenuSizeChange}
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