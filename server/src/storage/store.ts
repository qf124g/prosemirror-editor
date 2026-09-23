import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../../data/documents')

function ensureDir(): void {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 读取文档（不存在返回 null）
export function readDocument(id: string): any | null {
  const file = path.join(dataDir, `${id}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

// 写入文档
export function writeDocument(id: string, doc: any): void {
  ensureDir()
  fs.writeFileSync(path.join(dataDir, `${id}.json`), JSON.stringify(doc, null, 2), 'utf-8')
}