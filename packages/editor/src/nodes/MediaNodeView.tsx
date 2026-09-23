import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState } from 'react'
import type { NodeSpec } from 'prosemirror-model'
import type { EditorView } from 'prosemirror-view'
import type { EditorContext } from '../modules/types'

export type MediaKind = 'image' | 'video' | 'audio'

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

interface MediaWidgetProps {
  kind: MediaKind
  node: any
  view: EditorView
  getPos: () => number | undefined
  resourceResolver?: EditorContext['resourceResolver']
}

// 媒体渲染组件：占位符 + IntersectionObserver 懒加载 + 异步解析资源
function MediaWidget({ kind, node, resourceResolver }: MediaWidgetProps) {
  const { resourceId, mime, alt } = node.attrs
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        })
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || !resourceResolver || !resourceId || url) return
    let cancelled = false
    setLoading(true)
    resourceResolver(resourceId)
      .then((res) => {
        if (!cancelled) {
          setUrl(res.url)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [inView, resourceId, resourceResolver, url])

  const placeholderText = error ? '资源加载失败' : loading ? '资源加载中...' : kind === 'image' ? '图片' : kind === 'video' ? '视频' : '语音'
  const showPlaceholder = !url

  return (
    <div ref={ref} className={`media-widget media-widget--${kind}`} contentEditable={false}>
      {showPlaceholder ? (
        <div className="media-placeholder">{placeholderText}</div>
      ) : kind === 'image' ? (
        <img src={url!} alt={alt || ''} />
      ) : kind === 'video' ? (
        <video controls src={url!} />
      ) : (
        <audio controls src={url!} />
      )}
      {!showPlaceholder && mime && <span className="media-mime">{mime}</span>}
    </div>
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

// 生成指定类型的媒体 NodeView 工厂（闭包注入 resourceResolver）
export function createMediaNodeView(kind: MediaKind) {
  return (ctx: EditorContext) => {
    const Component = (props: any) => <MediaWidget kind={kind} resourceResolver={ctx.resourceResolver} {...props} />
    return createReactNodeView(Component)
  }
}