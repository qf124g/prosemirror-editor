import { AudioOutlined } from '@ant-design/icons'
import { createMediaNodeSpec, createMediaNodeView } from '../nodes/MediaNodeView'
import { insertMediaFromFile } from '../core/insert'
import type { EditorModule } from './types'

// 语音模块
export const audioModule: EditorModule = {
  name: 'audio',
  nodes: { audioResource: createMediaNodeSpec('audio', 'audio/mpeg') },
  nodeViews: { audioResource: createMediaNodeView('audio') },
  toolbarItems: [
    { id: 'audio', type: 'button', label: '语音', icon: AudioOutlined, onClick: (api) => insertMediaFromFile(api, 'audioResource', 'audio/*'), group: 'insert' },
  ],
  slashItems: [
    { id: 'audio', title: '语音', icon: AudioOutlined, group: '插入', keywords: ['语音', '音频', 'audio', '插入语音'], action: (api) => insertMediaFromFile(api, 'audioResource', 'audio/*') },
  ],
}