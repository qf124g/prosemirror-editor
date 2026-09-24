import type { NodeSpec, MarkSpec, Schema } from 'prosemirror-model'
import type { Plugin, EditorState, Command } from 'prosemirror-state'
import type { InputRule } from 'prosemirror-inputrules'
import type { EditorView, NodeViewConstructor } from 'prosemirror-view'

// 媒体上传：上传本地文件，返回后端分配的 resourceId
export type UploadMedia = (file: File) => Promise<{ resourceId: string; mime: string }>

// 媒体资源加载状态：loading 请求中 / success 已加载 / failed 加载失败
export type MediaResourceStatus = 'loading' | 'success' | 'failed'

// 单个媒体资源的展示状态，由宿主维护并驱动编辑器占位
export interface MediaResourceState {
  status: MediaResourceStatus
  url?: string
  mime?: string
}

// 外部媒体状态源：宿主维护资源状态（loading / success / failed + url），编辑器仅订阅读取并展示
// 编辑器内部不发起任何资源请求，状态完全由宿主在请求前后写入
export interface MediaResourceSource {
  // 读取某资源当前状态，返回引用需稳定（内容不变时不新建对象）
  getState: (resourceId: string) => MediaResourceState | undefined
  // 订阅状态变化，返回取消订阅函数
  subscribe: (listener: () => void) => () => void
  // 失败占位点击重试时由编辑器回调，宿主据此重新请求该资源
  retry: (resourceId: string) => void
}

// 图标统一用宽松类型，规避 antd 图标 ForwardRef 类型差异
type IconType = any
export interface EditorAPI {
  view: EditorView
  commands: Record<string, Command>
  uploadMedia?: UploadMedia
  runAISummary: () => void
  runAIRewrite: () => void
}

// 模块构建时注入的上下文
export interface EditorContext {
  uploadMedia?: UploadMedia
  mediaSource?: MediaResourceSource
}

export interface ToolbarOption {
  id: string
  label: string
  icon?: IconType
  command?: string
  active?: (state: EditorState) => boolean
}

export interface ToolbarItemConfig {
  id: string
  type: 'button' | 'dropdown' | 'color'
  label?: string
  icon?: IconType
  command?: string
  colorKind?: 'text' | 'background'
  // 工具栏分组标识：同组项聚合并与其它组之间展示分隔线
  group?: string
  options?: ToolbarOption[]
  active?: (state: EditorState) => boolean
  onClick?: (api: EditorAPI) => void
}

export interface SlashItemConfig {
  id: string
  title: string
  description?: string
  icon?: IconType
  keywords?: string[]
  group?: string
  command?: string
  action?: (api: EditorAPI) => void
}

// 每个能力一个模块：节点/标记/插件/命令/快捷键/输入规则/NodeView/工具栏项/斜杠菜单项
export interface EditorModule {
  name: string
  nodes?: Record<string, NodeSpec>
  marks?: Record<string, MarkSpec>
  plugins?: Plugin[]
  commands?: Record<string, Command>
  keymaps?: Record<string, Command>
  inputRules?: Array<(schema: Schema) => InputRule[]>
  nodeViews?: Record<string, (ctx: EditorContext) => NodeViewConstructor>
  toolbarItems?: ToolbarItemConfig[]
  slashItems?: SlashItemConfig[]
}

export type { NodeSpec, MarkSpec, Schema, Plugin, EditorState, Command, InputRule, EditorView }