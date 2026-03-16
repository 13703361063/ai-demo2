import { prisma } from '~/server/utils/prisma'
import { requireSessionId } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const sessionId = await requireSessionId(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, sessionId },
    select: { id: true },
  })
  if (!conversation) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  })

  return { messages }
})

