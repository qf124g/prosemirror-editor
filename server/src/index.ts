import express from 'express'
import cors from 'cors'
import { documentsRouter } from './routes/documents'
import { resourcesRouter } from './routes/resources'
import { aiRouter } from './routes/ai'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/documents', documentsRouter)
app.use('/api/resources', resourcesRouter)
app.use('/api/ai', aiRouter)

const PORT = Number(process.env.PORT) || 4000
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})