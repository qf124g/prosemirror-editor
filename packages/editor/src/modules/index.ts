import type { EditorModule } from './types'
import { textModule } from './text'
import { headingModule } from './heading'
import { listModule } from './list'
import { blockquoteModule } from './blockquote'
import { codeBlockModule } from './codeBlock'
import { linkModule } from './link'
import { colorModule } from './color'
import { imageModule } from './image'
import { videoModule } from './video'
import { audioModule } from './audio'
import { tableModule } from './table'
import { historyModule } from './history'
import { gapcursorModule } from './gapcursor'
import { aiSummaryModule } from './aiSummary'

// 主模块：在此统一注册所有内置模块（顺序影响工具栏展示顺序）
export const builtinModules: EditorModule[] = [
  textModule,
  headingModule,
  colorModule,
  listModule,
  blockquoteModule,
  codeBlockModule,
  linkModule,
  imageModule,
  videoModule,
  audioModule,
  tableModule,
  aiSummaryModule,
  historyModule,
  gapcursorModule,
]