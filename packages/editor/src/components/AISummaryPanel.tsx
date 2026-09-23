import { Modal, Spin } from 'antd'

interface AISummaryPanelProps {
  open: boolean
  loading: boolean
  summary: string
  onClose: () => void
}

// AI 摘要结果面板
export function AISummaryPanel({ open, loading, summary, onClose }: AISummaryPanelProps) {
  return (
    <Modal title="AI 摘要" open={open} onCancel={onClose} footer={null} width={640}>
      {loading ? (
        <div className="ai-summary-loading">
          <Spin tip="摘要生成中..." />
        </div>
      ) : (
        <div className="ai-summary-content">{summary || '暂无摘要'}</div>
      )}
    </Modal>
  )
}