import { TableOutlined, SettingOutlined } from '@ant-design/icons'
import {
  tableNodes,
  tableEditing,
  columnResizing,
  deleteTable,
  addRowBefore,
  addRowAfter,
  deleteRow,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  mergeCells,
  splitCell,
  toggleHeaderRow,
  toggleHeaderColumn,
} from 'prosemirror-tables'
import type { EditorModule } from './types'

// 插入 3x3 表格
const insertTable = (state: any, dispatch?: any) => {
  if (!dispatch) return true
  const { table, table_row, table_cell, table_header, paragraph } = state.schema.nodes
  const cell = (isHeader: boolean) => (isHeader ? table_header : table_cell).create({}, paragraph.create())
  const headerRow = table_row.create({}, [cell(true), cell(true), cell(true)])
  const bodyRow = table_row.create({}, [cell(false), cell(false), cell(false)])
  const tableNode = table.create({}, [headerRow, bodyRow, bodyRow])
  dispatch(state.tr.replaceSelectionWith(tableNode).scrollIntoView())
  return true
}

export const tableModule: EditorModule = {
  name: 'table',
  nodes: tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} }),
  plugins: [tableEditing(), columnResizing()],
  commands: {
    insertTable,
    deleteTable,
    addRowBefore,
    addRowAfter,
    deleteRow,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
  },
  toolbarItems: [
    { id: 'insertTable', type: 'button', label: '表格', icon: TableOutlined, command: 'insertTable', group: 'insert' },
    {
      id: 'tableOps',
      type: 'dropdown',
      label: '表格操作',
      icon: SettingOutlined,
      group: 'insert',
      options: [
        { id: 'addRowBefore', label: '上方插入行', command: 'addRowBefore' },
        { id: 'addRowAfter', label: '下方插入行', command: 'addRowAfter' },
        { id: 'deleteRow', label: '删除行', command: 'deleteRow' },
        { id: 'addColumnBefore', label: '左侧插入列', command: 'addColumnBefore' },
        { id: 'addColumnAfter', label: '右侧插入列', command: 'addColumnAfter' },
        { id: 'deleteColumn', label: '删除列', command: 'deleteColumn' },
        { id: 'mergeCells', label: '合并单元格', command: 'mergeCells' },
        { id: 'splitCell', label: '拆分单元格', command: 'splitCell' },
        { id: 'toggleHeaderRow', label: '切换表头行', command: 'toggleHeaderRow' },
        { id: 'deleteTable', label: '删除表格', command: 'deleteTable' },
      ],
    },
  ],
  slashItems: [
    { id: 'insertTable', title: '表格', icon: TableOutlined, command: 'insertTable', group: '插入', keywords: ['表格', 'table'] },
  ],
}