import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],

  tailwindcss: {
    configPath: 'tailwind.config.ts',
  },

  app: {
    head: {
      title: 'AI Chat Assistant',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  runtimeConfig: {
    dashscopeApiKey: process.env.DASHSCOPE_API_KEY || process.env.NUXT_DASHSCOPE_API_KEY || '',
    dashscopeBaseUrl:
      process.env.DASHSCOPE_BASE_URL ||
      process.env.NUXT_DASHSCOPE_BASE_URL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    dashscopeModel: process.env.DASHSCOPE_MODEL || process.env.NUXT_DASHSCOPE_MODEL || 'qwen-plus',
    maxInputChars: Number(process.env.MAX_INPUT_CHARS || 12000),
    rateLimitPerIpPerMin: Number(process.env.RATE_LIMIT_PER_IP_PER_MIN || 30),
    databaseUrl: process.env.DATABASE_URL || '',
    public: {
      appName: process.env.APP_NAME || 'AI Chat Assistant',
    },
  },

  nitro: {
    compressPublicAssets: true,
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})

