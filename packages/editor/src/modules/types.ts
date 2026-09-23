import type { NodeSpec, MarkSpec, Schema } from 'prosemirror-model'
import type { Plugin, EditorState, Command } from 'prosemirror-state'
import type { InputRule } from 'prosemirror-inputrules'
import type { EditorView, NodeViewConstructor } from 'prosemirror-view'

// 资源异步解析：根据 resourceId 换取可用的 url 与 mime
export type ResourceResolver = (resourceId: string) => Promise<{ url: string; mime: string }>

// 媒体上传：上传本地文件，返回后端分配的 resourceId
export type UploadMedia = (file: File) => Promise<{ resourceId: string; mime: string }>

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
  resourceResolver?: ResourceResolver
  uploadMedia?: UploadMedia
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