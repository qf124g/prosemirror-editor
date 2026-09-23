import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Space, Spin, message } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import {
  RichEditor,
  toJSON,
  toHTML,
  toMarkdown,
  downloadFile,
} from '@full-editor/editor'
import type { RichEditorHandle } from '@full-editor/editor'

const API = 'http://localhost:4000'
const DOC_ID = 'demo'

function App() {
  const editorRef = useRef<RichEditorHandle | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [initialDoc, setInitialDoc] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [docKey, setDocKey] = useState(0)

  useEffect(() => {
    fetch(`${API}/api/documents/${DOC_ID}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setInitialDoc(d)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  // 资源 id -> url 异步解析
  const resourceResolver = useCallback(async (resourceId: string) => {
    const res = await fetch(`${API}/api/resources/${resourceId}`)
    if (!res.ok) throw new Error('资源加载失败')
    const data = await res.json()
    return { url: `${API}${data.url}`, mime: data.mime || '' }
  }, [])

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

  const handleReady = useCallback((handle: RichEditorHandle) => {
    editorRef.current = handle
  }, [])

  // 内容变化 -> 防抖保存到后端
  const handleChange = useCallback((docJson: any) => {
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
  }, [])

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
          resourceResolver={resourceResolver}
          uploadMedia={uploadMedia}
          aiSummary={aiSummary}
        />
      </main>
    </div>
  )
}

export default App