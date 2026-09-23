import { Schema } from 'prosemirror-model'
import type { Plugin, Command } from 'prosemirror-state'
import { keymap } from 'prosemirror-keymap'
import { inputRules } from 'prosemirror-inputrules'
import type { EditorContext, EditorModule, SlashItemConfig, ToolbarItemConfig } from '../modules/types'

// 合并所有模块的节点/标记，生成唯一 Schema
export function buildSchema(modules: EditorModule[]): Schema {
  const nodes: Record<string, any> = {}
  const marks: Record<string, any> = {}
  for (const m of modules) {
    if (m.nodes) Object.assign(nodes, m.nodes)
    if (m.marks) Object.assign(marks, m.marks)
  }
  return new Schema({ nodes, marks })
}

// 聚合各模块命令
export function collectCommands(modules: EditorModule[]): Record<string, Command> {
  const result: Record<string, Command> = {}
  for (const m of modules) {
    if (m.commands) Object.assign(result, m.commands)
  }
  return result
}

// 聚合各模块插件
export function collectPlugins(modules: EditorModule[]): Plugin[] {
  const plugins: Plugin[] = []
  for (const m of modules) {
    if (m.plugins) plugins.push(...m.plugins)
  }
  return plugins
}

// 聚合各模块 NodeView（注入上下文产出真正的 NodeView 构造器）
export function collectNodeViews(modules: EditorModule[], ctx: EditorContext): Record<string, any> {
  const result: Record<string, any> = {}
  for (const m of modules) {
    if (m.nodeViews) {
      for (const [name, factory] of Object.entries(m.nodeViews)) {
        result[name] = factory(ctx)
      }
    }
  }
  return result
}

// 聚合各模块工具栏项
export function collectToolbarItems(modules: EditorModule[]): ToolbarItemConfig[] {
  const result: ToolbarItemConfig[] = []
  for (const m of modules) {
    if (m.toolbarItems) result.push(...m.toolbarItems)
  }
  return result
}

// 聚合各模块斜杠菜单项
export function collectSlashItems(modules: EditorModule[]): SlashItemConfig[] {
  const result: SlashItemConfig[] = []
  for (const m of modules) {
    if (m.slashItems) result.push(...m.slashItems)
  }
  return result
}

// 合并各模块快捷键为一个插件
export function collectKeymaps(modules: EditorModule[]): Plugin {
  const binding: Record<string, Command> = {}
  for (const m of modules) {
    if (m.keymaps) Object.assign(binding, m.keymaps)
  }
  return keymap(binding)
}

// 合并各模块输入规则
export function collectInputRules(modules: EditorModule[], schema: Schema): Plugin {
  const rules: any[] = []
  for (const m of modules) {
    if (m.inputRules) {
      for (const factory of m.inputRules) rules.push(...factory(schema))
    }
  }
  return inputRules({ rules })
}