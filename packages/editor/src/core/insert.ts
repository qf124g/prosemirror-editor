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

// 读取本地图片的原始宽高
function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

// 读取本地视频的原始宽高
function readVideoSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    video.src = url
  })
}

// 读取本地媒体的原始宽高：图片用 Image 解码，视频用 video 元数据，其余返回 null
async function readMediaSize(file: File): Promise<{ width: number; height: number } | null> {
  if (file.type.startsWith('image/')) return readImageSize(file)
  if (file.type.startsWith('video/')) return readVideoSize(file)
  return null
}

// 选择文件 -> 上传 -> 插入媒体节点（图片/视频/语音共用），并写入原始尺寸供占位继承
export function insertMediaFromFile(api: EditorAPI, nodeName: string, accept: string): void {
  if (!api.uploadMedia) return
  pickFile(accept, async (file) => {
    const size = await readMediaSize(file)
    const { resourceId, mime } = await api.uploadMedia!(file)
    insertBlockNode(api.view, nodeName, {
      resourceId,
      mime,
      width: size?.width ?? null,
      height: size?.height ?? null,
    })
  })
}