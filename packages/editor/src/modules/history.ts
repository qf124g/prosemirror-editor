import { history, undo, redo } from 'prosemirror-history'
import { UndoOutlined, RedoOutlined } from '@ant-design/icons'
import type { EditorModule } from './types'

// 撤销 / 重做
export const historyModule: EditorModule = {
  name: 'history',
  plugins: [history()],
  keymaps: {
    'Mod-z': undo,
    'Shift-Mod-z': redo,
    'Mod-y': redo,
  },
  commands: { undo, redo },
  toolbarItems: [
    { id: 'undo', type: 'button', label: '撤销', icon: UndoOutlined, command: 'undo', group: 'history' },
    { id: 'redo', type: 'button', label: '重做', icon: RedoOutlined, command: 'redo', group: 'history' },
  ],
}