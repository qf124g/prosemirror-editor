import { marks as basicMarks } from 'prosemirror-schema-basic'
import { LinkOutlined } from '@ant-design/icons'
import { markActive } from '../core/active'
import type { EditorModule, Command } from './types'

// 链接模块
const toggleLink: Command = (state, dispatch) => {
  const { from, to } = state.selection
  const linkMark = state.schema.marks.link
  if (linkMark.isInSet(state.selection.$from.marks())) {
    if (dispatch) dispatch(state.tr.removeMark(from, to, linkMark))
    return true
  }
  const href = window.prompt('请输入链接地址（http:// 或 https://）')
  if (href === null) return true
  if (dispatch) {
    dispatch(state.tr.addMark(from, to, linkMark.create({ href })).scrollIntoView())
  }
  return true
}

export const linkModule: EditorModule = {
  name: 'link',
  marks: { link: basicMarks.link },
  commands: { toggleLink },
  toolbarItems: [
    { id: 'link', type: 'button', label: '链接', icon: LinkOutlined, command: 'toggleLink', active: markActive('link'), group: 'text' },
  ],
}