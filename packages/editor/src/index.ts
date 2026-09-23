// 对外公共 API：组件、管理器、模块、创建函数、序列化工具与类型
export { RichEditor, RichEditor as default } from './RichEditor'
export type { RichEditorProps, RichEditorHandle, AICollabMode } from './RichEditor'
export { EditorManager } from './manager/EditorManager'
export { builtinModules } from './modules'
export { createEditor } from './core/createEditor'
export type { CreateEditorOptions, EditorInstance } from './core/createEditor'
export { createEditorState } from './core/createView'
export {
  toJSON,
  fromJSON,
  toHTML,
  fromHTML,
  toMarkdown,
  toPlainText,
  downloadFile,
} from './core/serialization'
export type {
  EditorModule,
  EditorAPI,
  EditorContext,
  ToolbarItemConfig,
  ToolbarOption,
  SlashItemConfig,
  ResourceResolver,
  UploadMedia,
  NodeSpec,
  MarkSpec,
  Schema,
  Plugin,
  EditorState,
  Command,
  EditorView,
} from './modules/types'
export { markActive, blockActive } from './core/active'