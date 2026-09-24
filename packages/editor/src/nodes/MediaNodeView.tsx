import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Ref } from 'react'
import { Spin, Button } from 'antd'
import { FileImageOutlined, VideoCameraOutlined, AudioOutlined } from '@ant-design/icons'
import type { NodeSpec } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'
import type { EditorContext, MediaResourceSource, MediaResourceStatus } from '../modules/types'

export type MediaKind = 'image' | 'video' | 'audio'

// 媒体类型的中文标签
const kindLabel = (kind: MediaKind): string => (kind === 'image' ? '图片' : kind === 'video' ? '视频' : '语音')

// 媒体类型对应的占位图标
function KindIcon({ kind, failed }: { kind: MediaKind; failed?: boolean }) {
  const cls = `media-kind-icon${failed ? ' media-kind-icon--failed' : ''}`
  if (kind === 'image') return <FileImageOutlined className={cls} />
  if (kind === 'video') return <VideoCameraOutlined className={cls} />
  return <AudioOutlined className={cls} />
}

// 媒体资源节点的通用 spec（图片/视频/语音共用）
export function createMediaNodeSpec(kind: MediaKind, defaultMime: string): NodeSpec {
  return {
    group: 'block',
    atom: true,
    draggable: true,
    attrs: {
      resourceId: { default: '' },
      mime: { default: defaultMime },
      alt: { default: '' },
      width: { default: null },
      height: { default: null },
    },
    parseDOM: [
      {
        tag: `div[data-resource-kind="${kind}"]`,
        getAttrs: (dom: any) => ({ resourceId: dom.getAttribute('data-resource-id') || '' }),
      },
    ],
    toDOM: (node: any) => ['div', { 'data-resource-kind': kind, 'data-resource-id': node.attrs.resourceId }],
  }
}

interface MediaFrameProps {
  kind: MediaKind
  status: MediaResourceStatus
  url?: string
  alt?: string
  mime?: string
  onRetry?: () => void
  frameRef?: Ref<HTMLDivElement>
  // 宽高比字符串（如 "16 / 9"），让占位继承最终媒体的尺寸，避免切换闪动
  aspectRatio?: string
}

// 通用媒体渲染框架：根据加载状态展示占位（loading / failed）或真实媒体（success）
function MediaFrame({ kind, status, url, alt, mime, onRetry, frameRef, aspectRatio }: MediaFrameProps) {
  const label = kindLabel(kind)
  const loaded = status === 'success' && !!url
  // 占位按已知宽高比撑开高度，与真实媒体尺寸一致
  const placeholderStyle = aspectRatio ? { aspectRatio } : undefined
  return (
    <div ref={frameRef} className={`media-widget media-widget--${kind}`} contentEditable={false}>
      {loaded ? (
        kind === 'image' ? (
          <img src={url} alt={alt || ''} />
        ) : kind === 'video' ? (
          <video controls src={url} />
        ) : (
          <audio controls src={url} />
        )
      ) : (
        <div className={`media-placeholder media-placeholder--${status}`} style={placeholderStyle}>
          {status === 'failed' ? (
            <>
              <KindIcon kind={kind} failed />
              <span className="media-status-text">{label}加载失败</span>
              {onRetry && (
                <Button type="link" size="small" onClick={onRetry}>
                  重试
                </Button>
              )}
            </>
          ) : (
            <>
              <Spin size="small" />
              <span className="media-status-text">{label}加载中...</span>
            </>
          )}
        </div>
      )}
      {loaded && mime && <span className="media-mime">{mime}</span>}
    </div>
  )
}

interface MediaWidgetProps {
  kind: MediaKind
  node: any
  mediaSource?: MediaResourceSource
}

// 媒体渲染组件：仅订阅外部状态源，按状态被动渲染；进入视窗后通过 load 回调通知外部发起请求
function MediaWidget({ kind, node, mediaSource }: MediaWidgetProps) {
  const { resourceId, mime, alt, width, height } = node.attrs
  const state = useSyncExternalStore(
    (cb) => mediaSource?.subscribe(cb) ?? (() => {}),
    () => mediaSource?.getState(resourceId),
  )
  const frameRef = useRef<HTMLDivElement>(null)
  const loaded = state?.status === 'success'

  // 用节点记录的原始宽高推导宽高比，供占位继承最终媒体尺寸
  const aspectRatio = width && height ? `${width} / ${height}` : undefined

  // 懒加载：进入视窗且尚未加载成功时，通知外部发起请求（rootMargin 提前 200px 预载）
  useEffect(() => {
    if (!mediaSource || !resourceId || loaded) return
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            mediaSource.load(resourceId)
            io.disconnect()
          }
        })
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [mediaSource, resourceId, loaded])

  return (
    <MediaFrame
      kind={kind}
      status={state?.status ?? 'loading'}
      url={state?.url}
      alt={alt}
      mime={mime}
      frameRef={frameRef}
      aspectRatio={aspectRatio}
      onRetry={mediaSource ? () => mediaSource.load(resourceId) : undefined}
    />
  )
}

// 将一个 React 组件包成 ProseMirror NodeView
export function createReactNodeView(Component: React.ComponentType<any>) {
  return (node: any, _view: EditorView, _getPos: () => number | undefined) => {
    const dom = document.createElement('div')
    dom.className = 'media-node-view'
    const root = createRoot(dom)
    const render = (n: any) => root.render(<Component node={n} />)
    render(node)
    return {
      dom,
      update(newNode: any) {
        if (newNode.type !== node.type) return false
        render(newNode)
        return true
      },
      destroy() {
        root.unmount()
      },
      selectNode() {
        dom.classList.add('ProseMirror-selectednode')
      },
      deselectNode() {
        dom.classList.remove('ProseMirror-selectednode')
      },
      stopEvent() {
        return true
      },
    }
  }
}

// 生成指定类型的媒体 NodeView 工厂（闭包注入 mediaSource）
export function createMediaNodeView(kind: MediaKind) {
  return (ctx: EditorContext) => {
    const Component = (props: any) => <MediaWidget kind={kind} mediaSource={ctx.mediaSource} {...props} />
    return createReactNodeView(Component)
  }
}