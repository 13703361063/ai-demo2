import OpenAI from 'openai'
import { defineEventHandler, readBody, setHeader, sendStream, H3Event } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireSessionId } from '~/server/utils/session'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequestBody {
  conversationId: string
  messages: ChatMessage[]
}

function createDashScopeClient(event: H3Event) {
  const config = useRuntimeConfig(event) as any
  const apiKey = String(config.dashscopeApiKey || '')
  const baseURL = String(config.dashscopeBaseUrl || '')

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'DashScope API key is not configured on the server',
    })
  }

  return new OpenAI({
    apiKey,
    baseURL,
  })
}

export default defineEventHandler(async (event) => {
  const sessionId = await requireSessionId(event)

  const contentType = getRequestHeader(event, 'content-type') || ''
  if (!contentType.includes('application/json')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid content type',
    })
  }

  const body = (await readBody(event)) as ChatRequestBody

  if (!body?.conversationId || typeof body.conversationId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing conversationId',
    })
  }

  if (!body?.messages || !Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
    })
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: body.conversationId, sessionId },
    select: { id: true },
  })
  if (!conversation) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  const client = createDashScopeClient(event)
  const config = useRuntimeConfig(event) as any

  // Persist the newest user message for this conversation (best-effort).
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')?.content?.trim()
  if (lastUser) {
    await prisma.message.create({
      data: { conversationId: body.conversationId, role: 'user', content: lastUser },
    })
  }

  // Update conversation title on first user message; also bump updatedAt.
  if (lastUser) {
    const current = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
      select: { title: true },
    })
    if (current?.title === '新对话') {
      const trimmed = lastUser.trim()
      const title = trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed
      await prisma.conversation.update({
        where: { id: body.conversationId },
        data: { title, updatedAt: new Date() },
      })
    } else {
      await prisma.conversation.update({
        where: { id: body.conversationId },
        data: { updatedAt: new Date() },
      })
    }
  }

  const assistantRow = await prisma.message.create({
    data: { conversationId: body.conversationId, role: 'assistant', content: '' },
    select: { id: true },
  })

  // Create provider stream first; if provider rejects (e.g. 402), return JSON error cleanly.
  let completion: any
  try {
    completion = await client.chat.completions.create({
      model: String(config.dashscopeModel || 'qwen-plus'),
      messages: body.messages,
      temperature: 0.7,
      stream: true,
    })
  } catch (error: any) {
    // Mark assistant message as failed (keep it visible in history)
    await prisma.message.update({
      where: { id: assistantRow.id },
      data: { content: '[Error] Upstream provider rejected the request.' },
    })

    const statusCode = Number(error?.status) || Number(error?.response?.status) || 500
    const message =
      error?.message ||
      error?.error?.message ||
      (statusCode === 402 ? 'Insufficient Balance' : 'Upstream provider error')

    throw createError({
      statusCode,
      statusMessage: message,
      data: {
        provider: 'dashscope',
        statusCode,
        message,
      },
    })
  }

  const encoder = new TextEncoder()

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')
  setHeader(event, 'Content-Encoding', 'identity')

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = ''
      try {
        // Flush headers / establish SSE early (helps avoid buffering).
        controller.enqueue(encoder.encode(':ok\n\n'))

        for await (const part of completion) {
          const delta = part.choices?.[0]?.delta?.content
          if (delta) {
            assistantText += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`))
          }
        }

        await prisma.message.update({
          where: { id: assistantRow.id },
          data: { content: assistantText },
        })
        await prisma.conversation.update({
          where: { id: body.conversationId },
          data: { updatedAt: new Date() },
        })

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        await prisma.message.update({
          where: { id: assistantRow.id },
          data: { content: assistantText || '[Error] Streaming interrupted.' },
        })
        controller.error(error)
      }
    },
    cancel() {
      // Stream is cancelled by client (AbortController etc.)
    },
  })

  return sendStream(event, stream)
})

