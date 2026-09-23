import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { EditorView } from 'prosemirror-view'

// 模式 B：批注建议（tracked changes 式）
// 对选中的文本，AI 给出改写建议：原文画红色删除线“待删除”，建议原文以绿色插入展示，
// 接受时把 [from, to] 替换为建议文本，拒绝则清除装饰。在用户接受前，正文文档没有任何改变。

interface SuggestionState {
  from: number
  to: number
  suggestion: string
}

const suggestionKey = new PluginKey<SuggestionState | null>('aiSuggestion')

export interface SuggestionPluginOptions {
  getSuggestion: (text: string, signal?: AbortSignal) => Promise<string>
}

function accept(view: EditorView) {
  const s = suggestionKey.getState(view.state)
  if (!s) return
  view.dispatch(view.state.tr.insertText(s.suggestion, s.from, s.to).setMeta(suggestionKey, { clear: true }).scrollIntoView())
}

function reject(view: EditorView) {
  view.dispatch(view.state.tr.setMeta(suggestionKey, { clear: true }))
}

// 构建“接受/拒绝”控制挂件
function controlWidget(view: EditorView): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ai-suggest-control'
  wrap.setAttribute('contenteditable', 'false')

  const yes = document.createElement('button')
  yes.type = 'button'
  yes.textContent = '接受'
  yes.addEventListener('mousedown', (e) => e.preventDefault())
  yes.addEventListener('click', () => accept(view))

  const no = document.createElement('button')
  no.type = 'button'
  no.textContent = '拒绝'
  no.addEventListener('mousedown', (e) => e.preventDefault())
  no.addEventListener('click', () => reject(view))

  wrap.appendChild(yes)
  wrap.appendChild(no)
  return wrap
}

export function createSuggestionPlugin(options: SuggestionPluginOptions): Plugin<SuggestionState | null> {
  const apply = (tr: Transaction, prev: SuggestionState | null): SuggestionState | null => {
    const meta = tr.getMeta(suggestionKey) as { set?: SuggestionState; clear?: boolean } | undefined
    if (meta?.clear) return null
    if (meta?.set) return meta.set
    if (!prev) return null
    // 文档一旦变化即作废（接受/拒绝通过 meta 处理，这里兜底其余编辑）
    if (tr.docChanged) return null
    return prev
  }

  const decorations = (state: EditorState) => {
    const s = suggestionKey.getState(state)
    if (!s) return DecorationSet.empty
    const sel = state.selection
    // 选区被移动或变更后不再高亮原区间
    if (sel.from !== s.from || sel.to !== s.to) return DecorationSet.empty

    const add = document.createElement('span')
    add.className = 'ai-suggest-add'
    add.setAttribute('contenteditable', 'false')
    add.textContent = s.suggestion

    return DecorationSet.create(state.doc, [
      Decoration.inline(s.from, s.to, { class: 'ai-suggest-delete' }),
      Decoration.widget(s.to, () => add, { side: 1 }),
      Decoration.widget(s.to, controlWidget, { side: 1 }),
    ])
  }

  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    const s = suggestionKey.getState(view.state)
    if (s) {
      if (event.key === 'Escape') {
        reject(view)
        return true
      }
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        accept(view)
        return true
      }
      return false
    }
    // 触发：Ctrl/Cmd + Alt + A（避开浏览器保留的 Cmd+Shift+A 等快捷键），且存在非空选区
    if ((event.metaKey || event.ctrlKey) && event.altKey && !event.shiftKey && (event.key === 'a' || event.key === 'A')) {
      if (view.state.selection.empty) return false
      void requestSuggestion(view, options.getSuggestion)
      return true
    }
    return false
  }

  return new Plugin<SuggestionState | null>({
    key: suggestionKey,
    state: { init: () => null, apply },
    props: { decorations, handleKeyDown },
  })
}

// 触发一次建议：选中文本 -> 请求改写 -> 写入插件状态
export async function requestSuggestion(view: EditorView, getSuggestion: SuggestionPluginOptions['getSuggestion'], signal?: AbortSignal) {
  const { selection, doc } = view.state
  if (selection.empty) return
  const from = selection.from
  const to = selection.to
  const text = doc.textBetween(from, to)
  if (!text.trim()) return
  const s = await getSuggestion(text, signal)
  if (!s || s === text) return
  view.dispatch(view.state.tr.setMeta(suggestionKey, { set: { from, to, suggestion: s } }))
}