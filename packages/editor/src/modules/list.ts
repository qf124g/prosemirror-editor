import { wrapInList } from 'prosemirror-schema-list'
import { wrappingInputRule } from 'prosemirror-inputrules'
import { UnorderedListOutlined, OrderedListOutlined } from '@ant-design/icons'
import { blockActive } from '../core/active'
import type { EditorModule, NodeSpec } from './types'

// 手动定义列表节点，规避 schema-list 节点导出差异
const listItem: NodeSpec = {
  content: 'paragraph block*',
  defining: true,
  parseDOM: [{ tag: 'li' }],
  toDOM: () => ['li', 0],
}

const bulletList: NodeSpec = {
  content: 'list_item+',
  group: 'block',
  parseDOM: [{ tag: 'ul' }],
  toDOM: () => ['ul', 0],
}

const orderedList: NodeSpec = {
  content: 'list_item+',
  group: 'block',
  attrs: { order: { default: 1 } },
  parseDOM: [
    {
      tag: 'ol',
      getAttrs: (dom: any) => ({ order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1 }),
    },
  ],
  toDOM: (node: any) => ['ol', node.attrs.order === 1 ? {} : { start: String(node.attrs.order) }, 0],
}

export const listModule: EditorModule = {
  name: 'list',
  nodes: { bullet_list: bulletList, ordered_list: orderedList, list_item: listItem },
  commands: {
    bulletList: (state, dispatch) => wrapInList(state.schema.nodes.bullet_list)(state, dispatch),
    orderedList: (state, dispatch) => wrapInList(state.schema.nodes.ordered_list)(state, dispatch),
  },
  inputRules: [
    (schema) => [
      wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),
      wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, (match) => ({ order: +match[1] })),
    ],
  ],
  toolbarItems: [
    { id: 'bulletList', type: 'button', label: '无序列表', icon: UnorderedListOutlined, command: 'bulletList', active: blockActive('bullet_list'), group: 'block' },
    { id: 'orderedList', type: 'button', label: '有序列表', icon: OrderedListOutlined, command: 'orderedList', active: blockActive('ordered_list'), group: 'block' },
  ],
  slashItems: [
    { id: 'bulletList', title: '无序列表', icon: UnorderedListOutlined, command: 'bulletList', group: '基础', keywords: ['列表', 'ul', '无序'] },
    { id: 'orderedList', title: '有序列表', icon: OrderedListOutlined, command: 'orderedList', group: '基础', keywords: ['列表', 'ol', '有序'] },
  ],
}