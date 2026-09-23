import { PictureOutlined } from '@ant-design/icons'
import { createMediaNodeSpec, createMediaNodeView } from '../nodes/MediaNodeView'
import { insertMediaFromFile } from '../core/insert'
import type { EditorModule } from './types'

// 图片模块
export const imageModule: EditorModule = {
  name: 'image',
  nodes: { imageResource: createMediaNodeSpec('image', 'image/png') },
  nodeViews: { imageResource: createMediaNodeView('image') },
  toolbarItems: [
    { id: 'image', type: 'button', label: '图片', icon: PictureOutlined, onClick: (api) => insertMediaFromFile(api, 'imageResource', 'image/*'), group: 'insert' },
  ],
  slashItems: [
    { id: 'image', title: '图片', icon: PictureOutlined, group: '插入', keywords: ['图片', 'image', '插入图片'], action: (api) => insertMediaFromFile(api, 'imageResource', 'image/*') },
  ],
}