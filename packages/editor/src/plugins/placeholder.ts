import { Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

// 判断文档是否为空（无任何实际内容），用于显示 placeholder
function docIsEmpty(view: EditorView): boolean {
  const doc = view.state.doc
  return (
    doc.childCount <= 1 &&
    !!doc.firstChild &&
    doc.firstChild.isTextblock &&
    doc.firstChild.content.size === 0
  )
}

// 空文档时给编辑器根节点加 is-empty 类，配合 CSS 显示占位文案。
// 不能用 :empty 直接判断，因为 ProseMirror 空文档也会渲染一个空的块节点（<p>）。
export function createPlaceholderPlugin(): Plugin {
  return new Plugin({
    view(view) {
      const refresh = (v: EditorView) => v.dom.classList.toggle('is-empty', docIsEmpty(v))
      refresh(view)
      return {
        update: (v) => refresh(v),
        destroy: () => view.dom.classList.remove('is-empty'),
      }
    },
  })
}