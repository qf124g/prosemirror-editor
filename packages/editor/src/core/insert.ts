import type { EditorView } from 'prosemirror-view'
import type { EditorAPI } from '../modules/types'

// 在当前选区插入一个原子块节点（图片/视频/语音等）
export function insertBlockNode(view: EditorView, nodeName: string, attrs: Record<string, any>): void {
  const type = view.state.schema.nodes[nodeName]
  if (!type) return
  const node = type.create(attrs)
  view.dispatch(view.state.tr.replaceSelectionWith(node))
  view.focus()
}

// 触发本地文件选择
export function pickFile(accept: string, onFile: (file: File) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.onchange = () => {
    const file = input.files && input.files[0]
    if (file) onFile(file)
  }
  input.click()
}

// 选择文件 -> 上传 -> 插入媒体节点（图片/视频/语音共用）
export function insertMediaFromFile(api: EditorAPI, nodeName: string, accept: string): void {
  if (!api.uploadMedia) return
  pickFile(accept, async (file) => {
    const { resourceId, mime } = await api.uploadMedia!(file)
    insertBlockNode(api.view, nodeName, { resourceId, mime })
  })
}