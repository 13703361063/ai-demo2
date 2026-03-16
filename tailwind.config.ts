import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#050509',
        'chat-sidebar': '#0f172a',
        'chat-message-user': '#0f766e',
        'chat-message-assistant': '#020617',
      },
    },
  },
  plugins: [],
} satisfies Config

