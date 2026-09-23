import { VideoCameraOutlined } from '@ant-design/icons'
import { createMediaNodeSpec, createMediaNodeView } from '../nodes/MediaNodeView'
import { insertMediaFromFile } from '../core/insert'
import type { EditorModule } from './types'

// 视频模块
export const videoModule: EditorModule = {
  name: 'video',
  nodes: { videoResource: createMediaNodeSpec('video', 'video/mp4') },
  nodeViews: { videoResource: createMediaNodeView('video') },
  toolbarItems: [
    { id: 'video', type: 'button', label: '视频', icon: VideoCameraOutlined, onClick: (api) => insertMediaFromFile(api, 'videoResource', 'video/*'), group: 'insert' },
  ],
  slashItems: [
    { id: 'video', title: '视频', icon: VideoCameraOutlined, group: '插入', keywords: ['视频', 'video', '插入视频'], action: (api) => insertMediaFromFile(api, 'videoResource', 'video/*') },
  ],
}