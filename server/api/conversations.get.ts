import { prisma } from '~/server/utils/prisma'
import { requireSessionId } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const sessionId = await requireSessionId(event)

  const conversations = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 50,
  })

  return { conversations }
})

