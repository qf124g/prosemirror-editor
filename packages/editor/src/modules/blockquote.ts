import { nodes as basicNodes } from 'prosemirror-schema-basic'
import { wrapIn } from 'prosemirror-commands'
import { wrappingInputRule } from 'prosemirror-inputrules'
import { MenuOutlined } from '@ant-design/icons'
import type { EditorModule } from './types'

// 引用块模块
export const blockquoteModule: EditorModule = {
  name: 'blockquote',
  nodes: { blockquote: basicNodes.blockquote },
  commands: {
    blockquote: (state, dispatch) => wrapIn(state.schema.nodes.blockquote)(state, dispatch),
  },
  inputRules: [(schema) => [wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote)]],
  slashItems: [
    { id: 'blockquote', title: '引用', icon: MenuOutlined, command: 'blockquote', group: '基础', keywords: ['引用', '引用块'] },
  ],
}