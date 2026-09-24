import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Space, Spin, Select, message } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import {
  RichEditor,
  toJSON,
  toHTML,
  toMarkdown,
  downloadFile,
} from '@full-editor/editor'
import type { RichEditorHandle, AICollabMode, MediaResourceSource, MediaResourceState } from '@full-editor/editor'

const API = 'http://localhost:4000'
const DOC_ID = 'demo'

function App() {
  const editorRef = useRef<RichEditorHandle | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [initialDoc, setInitialDoc] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [docKey, setDocKey] = useState(0)
  const [aiMode, setAiMode] = useState<AICollabMode>('ghost')

  // 媒体资源状态：由 App 维护 resourceId -> 加载状态，编辑器 NodeView 仅订阅读取展示
  const mediaStateRef = useRef<Map<string, MediaResourceState>>(new Map())
  const mediaListenersRef = useRef<Set<() => void>>(new Set())

  const setResourceState = useCallback((resourceId: string, state: MediaResourceState) => {
    mediaStateRef.current.set(resourceId, state)
    mediaListenersRef.current.forEach((listener) => listener())
  }, [])

  // 请求单个资源：成功后写入 url，失败标记 failed
  const loadResource = useCallback((resourceId: string) => {
    setResourceState(resourceId, { status: 'loading' })
    fetch(`${API}/api/resources/${resourceId}`)
      .then((res) => {
        if (!res.ok) throw new Error('资源加载失败')
        return res.json()
      })
      .then((data) => setResourceState(resourceId, { status: 'success', url: `${API}${data.url}`, mime: data.mime || '' }))
      .catch(() => setResourceState(resourceId, { status: 'failed' }))
  }, [setResourceState])

  // 只提供读取与订阅，编辑器内部不发起请求；retry 供失败占位的重试按钮回调外部重新请求
  const mediaSource = useMemo<MediaResourceSource>(() => ({
    getState: (resourceId: string) => mediaStateRef.current.get(resourceId),
    subscribe: (listener: () => void) => {
      mediaListenersRef.current.add(listener)
      return () => {
        mediaListenersRef.current.delete(listener)
      }
    },
    retry: (resourceId: string) => loadResource(resourceId),
  }), [loadResource])

  // 递归收集文档 JSON 中出现的媒体资源 id
  const collectResourceIds = (node: any, ids: Set<string>) => {
    if (!node || typeof node !== 'object') return
    if (node.attrs?.resourceId) ids.add(node.attrs.resourceId)
    if (Array.isArray(node.content)) node.content.forEach((child: any) => collectResourceIds(child, ids))
  }

  // 扫描文档，对尚未请求过的资源发起加载（外部负责请求）
  const ensureResources = useCallback((docJson: any) => {
    const ids = new Set<string>()
    collectResourceIds(docJson, ids)
    ids.forEach((id) => {
      if (!mediaStateRef.current.has(id)) loadResource(id)
    })
  }, [loadResource])

  // 加载初始文档后，扫描其中的媒体资源并发起请求
  useEffect(() => {
    fetch(`${API}/api/documents/${DOC_ID}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setInitialDoc(d)
        setLoaded(true)
        if (d) ensureResources(d)
      })
      .catch(() => setLoaded(true))
  }, [ensureResources])

  // 上传媒体，返回后端分配的 resourceId
  const uploadMedia = useCallback(async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API}/api/resources`, { method: 'POST', body: form })
    if (!res.ok) throw new Error('上传失败')
    return await res.json()
  }, [])

  // AI 摘要
  const aiSummary = useCallback(async (text: string) => {
    const res = await fetch(`${API}/api/ai/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'AI 摘要失败')
    }
    const data = await res.json()
    return data.summary
  }, [])

  // AI 幽灵续写
  const aiComplete = useCallback(async (context: string, signal?: AbortSignal) => {
    const res = await fetch(`${API}/api/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: context }),
      signal,
    })
    if (!res.ok) {
      if (res.status === 404) return ''
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'AI 续写失败')
    }
    const data = await res.json()
    return data.continuation || ''
  }, [])

  // AI 改写（批注建议 / diff 视图两种模式取用）
  const aiRewrite = useCallback(async (text: string, signal?: AbortSignal) => {
    const res = await fetch(`${API}/api/ai/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'AI 改写失败')
    }
    const data = await res.json()
    return data.suggestion || ''
  }, [])

  const handleReady = useCallback((handle: RichEditorHandle) => {
    editorRef.current = handle
  }, [])

  // 内容变化 -> 扫描新资源并防抖保存到后端
  const handleChange = useCallback((docJson: any) => {
    ensureResources(docJson)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      try {
        await fetch(`${API}/api/documents/${DOC_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(docJson),
        })
        // message.success('已保存')
      } catch {
        // message.error('保存失败')
      }
    }, 800)
  }, [ensureResources])

  const exportAs = (type: 'json' | 'html' | 'markdown') => {
    const view = editorRef.current?.view
    if (!view) return
    const schema = view.state.schema
    const doc = view.state.doc
    if (type === 'json') downloadFile('document.json', JSON.stringify(toJSON(doc), null, 2), 'application/json')
    else if (type === 'html') downloadFile('document.html', toHTML(schema, doc), 'text/html')
    else downloadFile('document.md', toMarkdown(schema, doc), 'text/markdown')
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (data && data.type === 'doc') {
          setInitialDoc(data)
          setDocKey((k) => k + 1)
          message.success('导入成功')
        } else {
          message.error('文件不是有效的文档 JSON')
        }
      } catch {
        message.error('文件解析失败')
      }
    }
    reader.readAsText(file)
  }

  if (!loaded) {
    return (
      <div className="app-loading">
        <Spin tip="加载中...">
          <div className="app-loading-placeholder" />
        </Spin>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">富文本编辑器</h1>
        <Space>
          <Select<AICollabMode>
            className="ai-mode-select"
            value={aiMode}
            onChange={setAiMode}
            options={[
              { value: 'ghost', label: 'AI 内联续写' },
              { value: 'suggest', label: 'AI 批注建议' },
              { value: 'diff', label: 'AI Diff 视图' },
            ]}
          />
          <Button
            disabled={aiMode === 'ghost'}
            onClick={() => editorRef.current?.runAIRewrite()}
          >
            AI 改写
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportAs('json')}>
            导出 JSON
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportAs('html')}>
            导出 HTML
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportAs('markdown')}>
            导出 Markdown
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
            导入 JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportFile(f)
              e.target.value = ''
            }}
          />
        </Space>
      </header>
      <main className="app-main">
        <RichEditor
          key={docKey}
          doc={initialDoc}
          onChange={handleChange}
          onReady={handleReady}
          mediaSource={mediaSource}
          uploadMedia={uploadMedia}
          aiSummary={aiSummary}
          aiComplete={aiComplete}
          aiMode={aiMode}
          aiRewrite={aiRewrite}
        />
      </main>
    </div>
  )
}

export default App