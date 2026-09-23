import type { EditorState } from 'prosemirror-state'

// 判断当前选区是否处于某个 mark（加粗/斜体等）激活状态
export const markActive = (markName: string) => (state: EditorState): boolean => {
  const markType = state.schema.marks[markName]
  if (!markType) return false
  const { from, $from, to, empty } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, markType)
}

// 判断当前选区所在块是否为指定节点类型（可选校验 attrs，如标题层级）
export const blockActive = (nodeName: string, attrs?: Record<string, any>) => (state: EditorState): boolean => {
  const type = state.schema.nodes[nodeName]
  if (!type) return false
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (node.type === type) {
      if (!attrs) return true
      return Object.keys(attrs).every((k) => node.attrs[k] === attrs[k])
    }
  }
  return false
}