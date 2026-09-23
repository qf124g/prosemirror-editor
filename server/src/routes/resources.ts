import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(__dirname, '../../uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, crypto.randomUUID() + ext)
  },
})

const upload = multer({ storage })

// 根据 resourceId 查找文件
function findFile(id: string): string | null {
  const files = fs.readdirSync(uploadDir)
  return files.find((f) => path.parse(f).name === id) ?? null
}

const guessMime = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
  }
  return map[ext] ?? 'application/octet-stream'
}

export const resourcesRouter = Router()

// 上传媒体
resourcesRouter.post('/', upload.single('file'), (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: '未收到文件' })
    return
  }
  const resourceId = path.parse(file.filename).name
  res.json({
    resourceId,
    mime: file.mimetype,
    filename: file.originalname,
    url: `/api/resources/${resourceId}/file`,
  })
})

// 按 id 获取资源元数据
resourcesRouter.get('/:id', (req, res) => {
  const found = findFile(req.params.id)
  if (!found) {
    res.status(404).json({ error: '资源不存在' })
    return
  }
  res.json({ resourceId: req.params.id, mime: guessMime(found), url: `/api/resources/${req.params.id}/file` })
})

// 按 id 获取资源二进制
resourcesRouter.get('/:id/file', (req, res) => {
  const found = findFile(req.params.id)
  if (!found) {
    res.status(404).send('not found')
    return
  }
  res.sendFile(path.join(uploadDir, found))
})