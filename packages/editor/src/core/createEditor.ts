import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { EditorManager } from '../manager/EditorManager'
import { builtinModules } from '../modules'
import { createEditorState } from './createView'
import { createSlashPlugin } from '../plugins/slashPlugin'
import { createPlaceholderPlugin } from '../plugins/placeholder'
import type {
  EditorModule,
  ResourceResolver,
  UploadMedia,
} from '../modules/types'

export interface CreateEditorOptions {
  element: HTMLElement
  doc?: any
  initialHTML?: string
  resourceResolver?: ResourceResolver
  uploadMedia?: UploadMedia
  modules?: EditorModule[]
  plugins?: any[]
  editable?: boolean
  placeholder?: string
  onChange?: (doc: any) => void
}

export interface EditorInstance {
  view: EditorView
  manager: EditorManager
  destroy: () => void
}

// Headless 创建编辑器：无需 React，供宿主直接挂载使用
export function createEditor(options: CreateEditorOptions): EditorInstance {
  const manager = new EditorManager([...builtinModules, ...(options.modules || [])], {
    resourceResolver: options.resourceResolver,
    uploadMedia: options.uploadMedia,
  })
  manager.init()

  const slashPlugin = createSlashPlugin({ getItems: () => manager.slashItems, onSelect: () => {} })
  // 模块自定义 keymap 优先于 baseKeymap 执行（如列表的 Enter/Tab 缩进需覆盖默认行为）
  const plugins = [...manager.plugins, keymap(baseKeymap), slashPlugin, createPlaceholderPlugin(), ...(options.plugins || [])]

  const state = createEditorState({
    schema: manager.schema,
    doc: options.doc,
    initialHTML: options.initialHTML,
    plugins,
  })

  const view = new EditorView(options.element, {
    state,
    nodeViews: manager.nodeViews,
    editable: () => options.editable !== false,
    attributes: { class: 'full-editor-content', 'data-placeholder': options.placeholder || '' },
    dispatchTransaction: function (this: EditorView, tr) {
      const next = this.state.apply(tr)
      this.updateState(next)
      if (tr.docChanged) {
        manager.emit('update', next.doc.toJSON())
        options.onChange?.(next.doc.toJSON())
      }
      if (tr.selectionSet) manager.emit('selectionChange', next)
    },
  })

  manager.view = view
  return { view, manager, destroy: () => view.destroy() }
}