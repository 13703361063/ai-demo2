import { getCookie, setCookie } from 'h3'

const COOKIE_NAME = 'sessionId'

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default defineEventHandler((event) => {
  const existing = getCookie(event, COOKIE_NAME)
  if (existing) return

  const id = createSessionId()
  setCookie(event, COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
})

