import { nodes as basicNodes } from 'prosemirror-schema-basic'
import { setBlockType } from 'prosemirror-commands'
import { textblockTypeInputRule } from 'prosemirror-inputrules'
import { FontSizeOutlined } from '@ant-design/icons'
import { blockActive } from '../core/active'
import type { EditorModule } from './types'

// 按层级生成标题命令与工具栏/斜杠菜单项
const commands: Record<string, any> = {}
for (let level = 1; level <= 6; level++) {
  commands[`heading${level}`] = (state: any, dispatch?: any) =>
    setBlockType(state.schema.nodes.heading, { level })(state, dispatch)
}

const options = [1, 2, 3, 4, 5, 6].map((level) => ({
  id: `heading${level}`,
  label: `标题 ${level}`,
  command: `heading${level}`,
  active: blockActive('heading', { level }),
}))

const slashItems = [1, 2, 3, 4, 5, 6].map((level) => ({
  id: `heading${level}`,
  title: `标题 ${level}`,
  command: `heading${level}`,
  group: '基础',
  keywords: ['标题', 'heading', `h${level}`],
}))

export const headingModule: EditorModule = {
  name: 'heading',
  nodes: { heading: basicNodes.heading },
  commands,
  inputRules: [
    (schema) => [
      textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, (match) => ({ level: match[1].length })),
    ],
  ],
  toolbarItems: [
    { id: 'heading', type: 'dropdown', label: '标题', icon: FontSizeOutlined, group: 'heading', options: [{ id: 'paragraph', label: '正文', command: 'paragraph', active: blockActive('paragraph') }, ...options] },
  ],
  slashItems,
}