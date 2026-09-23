import { Router } from 'express'

export const aiRouter = Router()

// AI 摘要：调用 OpenAI 兼容接口
aiRouter.post('/summary', async (req, res) => {
  const text: string | undefined = req.body?.text
  if (!text) {
    res.status(400).json({ error: '缺少文本' })
    return
  }

  const baseURL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    res.status(500).json({ error: '未配置 OPENAI_API_KEY' })
    return
  }

  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是文章摘要助手，请用简洁的中文总结给定内容的要点。' },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    res.status(502).json({ error: `AI 服务返回错误：${resp.status} ${errText.slice(0, 200)}` })
    return
  }

  const data: any = await resp.json()
  res.json({ summary: data.choices?.[0]?.message?.content ?? '' })
})