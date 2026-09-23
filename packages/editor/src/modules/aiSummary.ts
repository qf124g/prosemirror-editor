import { RobotOutlined } from '@ant-design/icons'
import type { EditorModule } from './types'

// AI 摘要：触发点在 RichEditor 中经 EditorAPI.runAISummary 对接
export const aiSummaryModule: EditorModule = {
  name: 'aiSummary',
  toolbarItems: [
    { id: 'aiSummary', type: 'button', label: 'AI 摘要', icon: RobotOutlined, onClick: (api) => api.runAISummary(), group: 'history' },
  ],
  slashItems: [
    { id: 'aiSummary', title: 'AI 摘要', icon: RobotOutlined, group: '智能', keywords: ['摘要', '总结', 'ai'], action: (api) => api.runAISummary() },
  ],
}