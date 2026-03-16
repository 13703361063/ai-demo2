import { getCookie } from 'h3'
import { prisma } from '~/server/utils/prisma'

const COOKIE_NAME = 'sessionId'

export async function requireSessionId(event: any) {
  const sessionId = getCookie(event, COOKIE_NAME)
  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing session cookie',
    })
  }

  // Ensure the session exists in DB to satisfy FK constraints.
  await prisma.session.upsert({
    where: { id: sessionId },
    update: {},
    create: { id: sessionId },
    select: { id: true },
  })

  return sessionId
}

