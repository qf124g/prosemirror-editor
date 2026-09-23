import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { EditorView } from 'prosemirror-view'

// 幽灵续写状态：建议文本 + 锚定位置（用于判断光标是否仍停留在原处）
interface GhostState {
  text: string
  from: number
}

const ghostKey = new PluginKey<GhostState | null>('ghostCompletion')

export interface GhostTextOptions {
  // 根据上文返回续写建议；signal 用于取消过期请求
  complete: (context: string, signal: AbortSignal) => Promise<string>
  // 是否允许触发续写（默认仅文本块光标处）
  enabled?: (state: EditorState) => boolean
  debounceMs?: number
}

// 幽灵续写插件：建议只存在于装饰层，接受时才落地为一次可撤销的 insertText
export function createGhostTextPlugin(options: GhostTextOptions): Plugin<GhostState | null> {
  const apply = (tr: Transaction, prev: GhostState | null): GhostState | null => {
    const meta = tr.getMeta(ghostKey) as { set?: string; clear?: boolean } | undefined
    if (meta?.clear) return null
    if (meta?.set !== undefined) return { text: meta.set, from: tr.selection.from }
    if (!prev) return null
    // 其它事务：锚点随文档变化做位置映射
    const from = tr.mapping.map(prev.from)
    // 文档变了但光标离开锚点，说明用户在别处继续输入 → 作废建议
    if (tr.docChanged && tr.selection.from !== from) return null
    return { text: prev.text, from }
  }

  const decorations = (state: EditorState) => {
    const g = ghostKey.getState(state)
    if (!g || !g.text) return null
    const sel = state.selection
    if (!sel.empty || sel.from !== g.from) return null
    const span = document.createElement('span')
    span.className = 'ghost-suggestion'
    span.setAttribute('contenteditable', 'false')
    span.textContent = g.text
    return DecorationSet.create(state.doc, [Decoration.widget(sel.from, () => span, { side: 1 })])
  }

  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    const g = ghostKey.getState(view.state)
    if (!g || !g.text) return false
    // Tab：接受建议，作为一次真实的、可撤销的插入
    if (event.key === 'Tab') {
      acceptGhostText(view)
      return true
    }
    // Escape：放弃建议
    if (event.key === 'Escape') {
      view.dispatch(view.state.tr.setMeta(ghostKey, { clear: true }))
      return true
    }
    // 任意真实字符输入：清掉建议，但不消费事件，让字符照常输入
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      view.dispatch(view.state.tr.setMeta(ghostKey, { clear: true }))
      return false
    }
    return false
  }

  return new Plugin<GhostState | null>({
    key: ghostKey,
    state: { init: () => null, apply },
    props: { decorations, handleKeyDown },
    view(view) {
      let controller: AbortController | null = null
      let timer: number | undefined

      const schedule = () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(async () => {
          const { selection, doc } = view.state
          if (options.enabled && !options.enabled(view.state)) return
          controller?.abort()
          controller = new AbortController()
          // 只取光标前一段上文，按固定预算裁剪
          const context = doc.textBetween(Math.max(0, selection.from - 2000), selection.from, '\n')
          if (!context.trim()) return
          try {
            const text = await options.complete(context, controller.signal)
            if (text) setGhostText(view, text)
          } catch {
            // 取消或失败的请求忽略，不清已有建议
          }
        }, options.debounceMs ?? 500)
      }

      return {
        update(v, prevState) {
          const docChanged = !v.state.doc.eq(prevState.doc)
          const moved = v.state.selection.from !== prevState.selection.from
          if (docChanged) schedule()
          else if (moved) controller?.abort()
        },
        destroy() {
          controller?.abort()
          window.clearTimeout(timer)
        },
      }
    },
  })
}

// 手动设置建议文本
export function setGhostText(view: EditorView, text: string) {
  const meta = text ? { set: text } : { clear: true }
  view.dispatch(view.state.tr.setMeta(ghostKey, meta))
}

// 接受建议：把建议文本作为一次 insertText 落地（进入撤销栈，Ctrl+Z 可撤销）
export function acceptGhostText(view: EditorView) {
  const g = ghostKey.getState(view.state)
  if (!g || !g.text) return
  view.dispatch(view.state.tr.insertText(g.text).setMeta(ghostKey, { clear: true }).scrollIntoView())
}