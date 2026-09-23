import { Router } from 'express'
import { readDocument, writeDocument } from '../storage/store'

export const documentsRouter = Router()

// 获取文档
documentsRouter.get('/:id', (req, res) => {
  const doc = readDocument(req.params.id)
  if (!doc) {
    res.status(404).json({ error: '文档不存在' })
    return
  }
  res.json(doc)
})

// 保存文档
documentsRouter.put('/:id', (req, res) => {
  writeDocument(req.params.id, req.body)
  res.json({ ok: true, id: req.params.id })
})