import { FontColorsOutlined, HighlightOutlined } from '@ant-design/icons'
import type { EditorModule, MarkSpec } from './types'

// 文字颜色 / 背景高亮
const textColor: MarkSpec = {
  attrs: { color: { default: null } },
  parseDOM: [
    { tag: 'span', getAttrs: (dom: any) => (dom.style.color ? { color: dom.style.color } : null) },
  ],
  toDOM: (mark: any) => ['span', { style: `color: ${mark.attrs.color}` }, 0],
  inclusive: false,
}

const backgroundColor: MarkSpec = {
  attrs: { color: { default: null } },
  parseDOM: [
    { tag: 'span', getAttrs: (dom: any) => (dom.style.backgroundColor ? { color: dom.style.backgroundColor } : null) },
  ],
  toDOM: (mark: any) => ['span', { style: `background-color: ${mark.attrs.color}` }, 0],
  inclusive: false,
}

export const colorModule: EditorModule = {
  name: 'color',
  marks: { textColor, backgroundColor },
  toolbarItems: [
    { id: 'textColor', type: 'color', label: '文字颜色', icon: FontColorsOutlined, colorKind: 'text', group: 'color' },
    { id: 'backgroundColor', type: 'color', label: '背景高亮', icon: HighlightOutlined, colorKind: 'background', group: 'color' },
  ],
}