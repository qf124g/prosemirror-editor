import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { EditorView } from 'prosemirror-view'
import { diffWords } from './diff'
import type { DiffOp } from './diff'

// 模式 C：Diff 视图（原文 vs AI 建议）
// 不在正文上画红绿高亮，而是弹出一张“差异卡片”，逐词展示删除（- 红）与新增（+ 绿），
// 用户整体接受后才把选区替换为建议文本；正文在用户接受前保持不变。

interface DiffState {
  from: number
  to: number
  suggestion: string
  ops: DiffOp[]
}

const diffKey = new PluginKey<DiffState | null>('aiDiff')

export interface DiffPluginOptions {
  getSuggestion: (text: string, signal?: AbortSignal) => Promise<string>
}

function accept(view: EditorView) {
  const s = diffKey.getState(view.state)
  if (!s) return
  view.dispatch(view.state.tr.insertText(s.suggestion, s.from, s.to).setMeta(diffKey, { clear: true }).scrollIntoView())
}

function reject(view: EditorView) {
  view.dispatch(view.state.tr.setMeta(diffKey, { clear: true }))
}

// 由 diff ops 拼出“删除/新增”两行可读文本
function buildDiffCard(view: EditorView, state: DiffState): HTMLElement {
  const removed = state.ops.filter((o) => o.type === 'del').map((o) => o.text).join('')
  const added = state.ops.filter((o) => o.type === 'add').map((o) => o.text).join('')

  const card = document.createElement('div')
  card.className = 'ai-diff-card'
  card.setAttribute('contenteditable', 'false')

  const delLine = document.createElement('div')
  delLine.className = 'ai-diff-line ai-diff-del'
  delLine.textContent = removed ? '- ' + removed : '- （无删除）'

  const addLine = document.createElement('div')
  addLine.className = 'ai-diff-line ai-diff-add'
  addLine.textContent = added ? '+ ' + added : '+ （无新增）'

  const actions = document.createElement('div')
  actions.className = 'ai-diff-actions'

  const yes = document.createElement('button')
  yes.type = 'button'
  yes.textContent = '接受全部'
  yes.addEventListener('mousedown', (e) => e.preventDefault())
  yes.addEventListener('click', () => accept(view))

  const no = document.createElement('button')
  no.type = 'button'
  no.textContent = '拒绝'
  no.addEventListener('mousedown', (e) => e.preventDefault())
  no.addEventListener('click', () => reject(view))

  actions.appendChild(yes)
  actions.appendChild(no)

  card.appendChild(delLine)
  card.appendChild(addLine)
  card.appendChild(actions)
  return card
}

export function createDiffPlugin(options: DiffPluginOptions): Plugin<DiffState | null> {
  const apply = (tr: Transaction, prev: DiffState | null): DiffState | null => {
    const meta = tr.getMeta(diffKey) as { set?: DiffState; clear?: boolean } | undefined
    if (meta?.clear) return null
    if (meta?.set) return meta.set
    if (!prev) return null
    if (tr.docChanged) return null
    return prev
  }

  const decorations = (state: EditorState) => {
    const s = diffKey.getState(state)
    if (!s) return DecorationSet.empty
    const sel = state.selection
    if (sel.from !== s.from || sel.to !== s.to) return DecorationSet.empty
    return DecorationSet.create(state.doc, [Decoration.widget(s.to, (view) => buildDiffCard(view, s), { side: 1 })])
  }

  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    const s = diffKey.getState(view.state)
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
      void requestDiff(view, options.getSuggestion)
      return true
    }
    return false
  }

  return new Plugin<DiffState | null>({
    key: diffKey,
    state: { init: () => null, apply },
    props: { decorations, handleKeyDown },
  })
}

// 触发一次 diff：选中文本 -> 请求改写 -> 计算 word diff -> 写入插件状态
export async function requestDiff(view: EditorView, getSuggestion: DiffPluginOptions['getSuggestion'], signal?: AbortSignal) {
  const { selection, doc } = view.state
  if (selection.empty) return
  const from = selection.from
  const to = selection.to
  const text = doc.textBetween(from, to)
  if (!text.trim()) return
  const suggestion = await getSuggestion(text, signal)
  if (!suggestion || suggestion === text) return
  const ops = diffWords(text, suggestion)
  view.dispatch(view.state.tr.setMeta(diffKey, { set: { from, to, suggestion, ops } }))
}