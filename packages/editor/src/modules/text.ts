import { nodes as basicNodes, marks as basicMarks } from 'prosemirror-schema-basic'
import { toggleMark, setBlockType } from 'prosemirror-commands'
import { markActive } from '../core/active'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import type { EditorModule } from './types'

const toggle = (markName: string) => (state: any, dispatch?: any) =>
  toggleMark(state.schema.marks[markName])(state, dispatch)

// 基础文本模块：文档骨架节点 + 常用行内标记
export const textModule: EditorModule = {
  name: 'text',
  nodes: {
    doc: basicNodes.doc,
    paragraph: basicNodes.paragraph,
    text: basicNodes.text,
    hard_break: basicNodes.hard_break,
  },
  marks: {
    strong: basicMarks.strong,
    em: basicMarks.em,
    code: basicMarks.code,
    underline: {
      parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
      toDOM: () => ['u', 0],
    },
    strike: {
      parseDOM: [{ tag: 's' }, { tag: 'del' }, { style: 'text-decoration=line-through' }],
      toDOM: () => ['s', 0],
    },
  },
  commands: {
    paragraph: (state, dispatch) => setBlockType(state.schema.nodes.paragraph)(state, dispatch),
    toggleBold: toggle('strong'),
    toggleItalic: toggle('em'),
    toggleUnderline: toggle('underline'),
    toggleStrike: toggle('strike'),
    toggleCode: toggle('code'),
  },
  keymaps: {
    'Mod-b': toggle('strong'),
    'Mod-i': toggle('em'),
    'Mod-u': toggle('underline'),
  },
  toolbarItems: [
    { id: 'bold', type: 'button', label: '加粗', icon: BoldOutlined, command: 'toggleBold', active: markActive('strong'), group: 'text' },
    { id: 'italic', type: 'button', label: '斜体', icon: ItalicOutlined, command: 'toggleItalic', active: markActive('em'), group: 'text' },
    { id: 'underline', type: 'button', label: '下划线', icon: UnderlineOutlined, command: 'toggleUnderline', active: markActive('underline'), group: 'text' },
    { id: 'strike', type: 'button', label: '删除线', icon: StrikethroughOutlined, command: 'toggleStrike', active: markActive('strike'), group: 'text' },
    { id: 'code', type: 'button', label: '行内代码', icon: CodeOutlined, command: 'toggleCode', active: markActive('code'), group: 'text' },
  ],
}