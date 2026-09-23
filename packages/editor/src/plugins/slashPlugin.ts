import { Plugin, PluginKey } from 'prosemirror-state'
import type { SlashItemConfig } from '../modules/types'

export interface SlashState {
  active: boolean
  from: number
  query: string
  index: number
}

export const emptySlashState: SlashState = { active: false, from: 0, query: '', index: 0 }

export const slashPluginKey = new PluginKey<SlashState>('slashMenu')

export interface SlashPluginOptions {
  getItems: () => SlashItemConfig[]
  onSelect: (item: SlashItemConfig) => void
}

// 根据输入过滤斜杠菜单项
export function filterSlashItems(items: SlashItemConfig[], query: string): SlashItemConfig[] {
  const q = query.toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const haystack = [item.title, item.description, ...(item.keywords || [])].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

// / 唤起插入菜单的插件
export function createSlashPlugin(options: SlashPluginOptions): Plugin<SlashState> {
  return new Plugin<SlashState>({
    key: slashPluginKey,
    state: {
      init: () => emptySlashState,
      apply(tr, prev) {
        const meta = tr.getMeta(slashPluginKey) as any
        if (meta) {
          if (meta.open) return { active: true, from: meta.from, query: '', index: 0 }
          if (meta.close) return emptySlashState
          if (meta.index !== undefined && prev.active) return { ...prev, index: meta.index }
          return prev
        }
        if (!prev.active) return prev
        const from = tr.mapping.map(prev.from)
        const to = tr.selection.from
        if (to < from) return emptySlashState
        const text = tr.doc.textBetween(from, to, '\0', '\0')
        const match = /^\/([^\s/]*)$/.exec(text)
        if (!match) return emptySlashState
        return { active: true, from, query: match[1], index: 0 }
      },
    },
    props: {
      handleKeyDown(view, event) {
        const state = slashPluginKey.getState(view.state)
        // 已激活：处理导航 / 回车 / 取消
        if (state && state.active) {
          const items = filterSlashItems(options.getItems(), state.query)
          if (event.key === 'ArrowDown') {
            const next = items.length ? (state.index + 1) % items.length : 0
            view.dispatch(view.state.tr.setMeta(slashPluginKey, { index: next }))
            return true
          }
          if (event.key === 'ArrowUp') {
            const next = items.length ? (state.index - 1 + items.length) % items.length : 0
            view.dispatch(view.state.tr.setMeta(slashPluginKey, { index: next }))
            return true
          }
          if (event.key === 'Enter') {
            const item = items[state.index]
            if (item) options.onSelect(item)
            else view.dispatch(view.state.tr.setMeta(slashPluginKey, { close: true }))
            return true
          }
          if (event.key === 'Escape') {
            view.dispatch(view.state.tr.setMeta(slashPluginKey, { close: true }))
            return true
          }
          // 其它按键交回默认输入流程，由 apply 计算 query / 关闭菜单
          return false
        }
        // 未激活：键入 / 唤起菜单（keydown 足够可靠，无需依赖 textInput）
        if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const { from, to, $from } = view.state.selection
          if (!$from.parent.isTextblock) return false
          view.dispatch(view.state.tr.insertText('/', from, to).setMeta(slashPluginKey, { open: true, from }))
          return true
        }
        return false
      },
    },
  })
}