import { prisma } from '~/server/utils/prisma'
import { requireSessionId } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const sessionId = await requireSessionId(event)

  const conversation = await prisma.conversation.create({
    data: {
      sessionId,
      title: '新对话',
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return { conversation }
})

