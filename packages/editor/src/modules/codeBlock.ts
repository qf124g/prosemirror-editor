import { nodes as basicNodes } from 'prosemirror-schema-basic'
import { setBlockType } from 'prosemirror-commands'
import { textblockTypeInputRule } from 'prosemirror-inputrules'
import { CodeOutlined } from '@ant-design/icons'
import { blockActive } from '../core/active'
import type { EditorModule } from './types'

// 代码块模块
export const codeBlockModule: EditorModule = {
  name: 'codeBlock',
  nodes: { code_block: basicNodes.code_block },
  commands: {
    codeBlock: (state, dispatch) => setBlockType(state.schema.nodes.code_block)(state, dispatch),
  },
  inputRules: [(schema) => [textblockTypeInputRule(/^```$/, schema.nodes.code_block)]],
  toolbarItems: [
    { id: 'codeBlock', type: 'button', label: '代码块', icon: CodeOutlined, command: 'codeBlock', active: blockActive('code_block'), group: 'block' },
  ],
  slashItems: [
    { id: 'codeBlock', title: '代码块', icon: CodeOutlined, command: 'codeBlock', group: '基础', keywords: ['代码', 'code'] },
  ],
}