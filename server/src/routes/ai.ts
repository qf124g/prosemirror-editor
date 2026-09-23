import { Router } from 'express'

export const aiRouter = Router()

// 阿里云百炼（DashScope）OpenAI 兼容接口配置
const BASE_URL = (process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
const API_KEY = process.env.DASHSCOPE_API_KEY
const MODEL = process.env.DASHSCOPE_MODEL || 'qwen-plus'

// 调用大模型 chat 接口，返回 assistant 文本
async function chat(system: string, user: string, temperature = 0.3): Promise<string> {
  if (!API_KEY) throw new Error('未配置 DASHSCOPE_API_KEY')
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
    }),
  })
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`AI 服务返回错误：${resp.status} ${errText.slice(0, 200)}`)
  }
  const data: any = await resp.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 服务未返回内容')
  return content
}

// AI 摘要：总结给定内容要点
aiRouter.post('/summary', async (req, res) => {
  const text: string | undefined = req.body?.text
  if (!text) {
    res.status(400).json({ error: '缺少文本' })
    return
  }
  try {
    const summary = await chat('你是文章摘要助手，请用简洁的中文总结给定内容的要点。', text)
    res.json({ summary })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// AI 续写：给定上文，返回一段自然流畅的后续内容
aiRouter.post('/complete', async (req, res) => {
  const text: string | undefined = req.body?.text
  if (!text) {
    res.status(400).json({ error: '缺少文本' })
    return
  }
  try {
    const continuation = await chat(
      '你是写作助手，请基于上下文自然流畅地续写，直接输出续写内容，不要解释，不要重复上文。',
      text,
      0.7,
    )
    res.json({ continuation })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})