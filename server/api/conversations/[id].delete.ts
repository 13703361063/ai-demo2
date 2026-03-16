import { prisma } from '~/server/utils/prisma'
import { requireSessionId } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const sessionId = await requireSessionId(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const existing = await prisma.conversation.findFirst({
    where: { id, sessionId },
    select: { id: true },
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  await prisma.conversation.delete({ where: { id } })
  return { ok: true }
})

