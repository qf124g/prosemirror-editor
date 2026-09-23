import { gapCursor } from 'prosemirror-gapcursor'
import type { EditorModule } from './types'

// 块间光标（在空白处点击定位）
export const gapcursorModule: EditorModule = {
  name: 'gapcursor',
  plugins: [gapCursor()],
}