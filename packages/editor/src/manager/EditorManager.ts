import type { Schema } from 'prosemirror-model'
import type { Plugin, Command } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import {
  buildSchema,
  collectCommands,
  collectInputRules,
  collectKeymaps,
  collectNodeViews,
  collectPlugins,
  collectSlashItems,
  collectToolbarItems,
} from './registry'
import type {
  EditorContext,
  EditorModule,
  SlashItemConfig,
  ToolbarItemConfig,
} from '../modules/types'

type EventHandler = (...args: any[]) => void

// 模块 / 事件注册中心：合并模块能力，对外暴露事件与运行时扩展接口
export class EditorManager {
  readonly context: EditorContext
  private modules: EditorModule[]

  private _schema!: Schema
  private _commands: Record<string, Command> = {}
  private _plugins: Plugin[] = []
  private _nodeViews: Record<string, any> = {}
  private _toolbarItems: ToolbarItemConfig[] = []
  private _slashItems: SlashItemConfig[] = []

  private listeners = new Map<string, Set<EventHandler>>()

  view?: EditorView

  constructor(modules: EditorModule[], context: EditorContext = {}) {
    this.context = context
    this.modules = [...modules]
  }

  // 注册模块（需在 init 之前调用，schema 级能力才生效）
  registerModule(module: EditorModule): this {
    this.modules.push(module)
    return this
  }

  registerModules(modules: EditorModule[]): this {
    modules.forEach((m) => this.registerModule(m))
    return this
  }

  // 合并模块能力，产出 schema / commands / plugins / nodeViews / toolbar / slash
  init(): this {
    this._schema = buildSchema(this.modules)
    this._commands = collectCommands(this.modules)
    this._nodeViews = collectNodeViews(this.modules, this.context)
    this._toolbarItems = collectToolbarItems(this.modules)
    this._slashItems = collectSlashItems(this.modules)
    this._plugins = [
      ...collectPlugins(this.modules),
      collectKeymaps(this.modules),
      collectInputRules(this.modules, this._schema),
    ]
    return this
  }

  get schema(): Schema {
    return this._schema
  }

  get commands(): Record<string, Command> {
    return this._commands
  }

  get plugins(): Plugin[] {
    return this._plugins
  }

  get nodeViews(): Record<string, any> {
    return this._nodeViews
  }

  get toolbarItems(): ToolbarItemConfig[] {
    return this._toolbarItems
  }

  get slashItems(): SlashItemConfig[] {
    return this._slashItems
  }

  // 运行时动态追加工具项 / 斜杠菜单项（不涉及 schema 变更）
  addToolbarItem(item: ToolbarItemConfig): this {
    this._toolbarItems.push(item)
    this.emit('toolbarChange')
    return this
  }

  addSlashItem(item: SlashItemConfig): this {
    this._slashItems.push(item)
    this.emit('slashChange')
    return this
  }

  // 事件系统
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((h) => h(...args))
  }
}