<template>
  <div
    class="h-[100dvh] flex bg-chat-bg text-gray-100"
    :class="isDark ? 'theme-dark' : 'theme-light'"
  >
    <!-- Toast -->
    <div
      v-if="copyHint"
      class="fixed top-3 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-slate-900/90 border border-slate-700 px-4 py-2 text-xs text-emerald-200 shadow-lg"
    >
      {{ copyHint }}
    </div>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/60 md:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="fixed left-0 top-0 z-50 h-[100dvh] w-72 border-r border-slate-800 bg-chat-sidebar flex flex-col transform transition-transform md:static md:z-auto md:h-auto md:w-64 md:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <div class="p-4 border-b border-slate-700">
        <button
          class="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium transition-colors"
          @click="onNewConversation"
        >
          <span>新建对话</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <button
          v-for="c in conversations"
          :key="c.id"
          class="w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors"
          :class="c.id === activeConversationId
            ? 'bg-slate-900/60 border-slate-600 text-slate-100'
            : 'bg-transparent border-transparent hover:bg-slate-900/40 text-slate-300'"
          @click="onSelectConversation(c.id)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="truncate">{{ c.title || '新对话' }}</span>
            <button
              class="shrink-0 text-slate-500 hover:text-rose-300"
              type="button"
              title="删除"
              @click.stop="onDeleteConversation(c.id)"
            >
              ✕
            </button>
          </div>
        </button>
        <div v-if="conversations.length === 0" class="p-3 text-xs text-slate-400">
          暂无历史对话
        </div>
      </div>
      <div class="p-4 border-t border-slate-700 text-xs text-slate-400">
        <p>环境变量请配置在 <code>.env</code> 中，前端不会暴露 API Key。</p>
      </div>
    </aside>

    <!-- Main chat area -->
    <main class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="h-14 border-b border-slate-800 flex items-center px-4 md:px-6 justify-between">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900/60"
            @click="sidebarOpen = true"
            aria-label="打开侧边栏"
          >
            ☰
          </button>
          <span class="h-2 w-2 rounded-full bg-emerald-500" />
          <h1 class="text-sm font-semibold">
            企业级 AI 对话助手
          </h1>
        </div>
      </header>

      <!-- Messages -->
      <section
        ref="messagesEl"
        class="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4 scroll-smooth"
      >
        <div
          v-if="messages.length === 0"
          class="h-full flex flex-col items-center justify-center text-center text-slate-400"
        >
          <p class="text-lg font-semibold mb-2">开始你的第一个问题</p>
          <p class="max-w-md text-sm">
            比如输入「帮我写一个 Nuxt3 + TypeScript 的 AI 对话界面」，看看 AI 会如何回答。
          </p>
        </div>

        <div
          v-for="message in messages"
          :key="message.id"
          class="flex gap-3 group"
          :class="message.role === 'assistant' ? 'justify-start' : 'justify-end'"
        >
          <div
            v-if="message.role === 'assistant'"
            class="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold shrink-0"
          >
            AI
          </div>
          <div class="relative max-w-[85vw] md:max-w-3xl">
            <div
              class="w-fit rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              :class="message.role === 'assistant'
                ? ['bg-chat-message-assistant border border-slate-800', isDark ? 'text-slate-100' : 'text-slate-900']
                : 'bg-chat-message-user text-white'"
              @touchstart.passive="message.role === 'assistant' ? onAssistantTouchStart(message.content) : undefined"
              @touchend.passive="message.role === 'assistant' ? onAssistantTouchEnd() : undefined"
              @touchcancel.passive="message.role === 'assistant' ? onAssistantTouchEnd() : undefined"
            >
              {{ message.content }}
            </div>
          </div>
          <div
            v-if="message.role === 'user'"
            class="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-semibold shrink-0"
          >
            U
          </div>
        </div>

        <div v-if="isStreaming" class="flex items-center gap-2 text-xs text-slate-400">
          <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          思考中…
        </div>
      </section>

      <!-- Input -->
      <footer class="border-t border-slate-800 px-4 md:px-6 py-3 md:py-4 bg-[#020617]">
        <div class="max-w-3xl mx-auto space-y-2">
          <form class="space-y-3" @submit.prevent="sendMessage">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in quickPrompts"
                :key="item.id"
                type="button"
                class="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-[12px] text-slate-200 hover:bg-slate-900/70 hover:border-slate-600 transition-colors disabled:opacity-50"
                :disabled="isStreaming"
                @click="applyQuickPrompt(item.template)"
              >
                {{ item.label }}
              </button>
            </div>
            <div
              class="rounded-2xl border border-slate-700 bg-slate-900/60 focus-within:border-emerald-500 transition-colors"
            >
              <textarea
                ref="inputEl"
                v-model="input"
                rows="3"
                class="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
                placeholder="输入你的问题，按 Enter 发送。Shift+Enter 换行。"
                @keydown.enter.exact.prevent="sendMessage"
              />
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
              <div class="flex items-center gap-3">
                <span>API Key 安全存储于服务端，前端不可见。</span>
              </div>
              <div class="flex items-center gap-2 justify-end">
                <button
                  v-if="isStreaming"
                  type="button"
                  class="inline-flex items-center justify-center gap-1 rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-2 sm:py-1.5 text-xs font-medium text-white transition-colors"
                  @click="stopStreaming"
                >
                  停止
                </button>
                <button
                  v-else
                  type="submit"
                  class="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 sm:py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!input.trim()"
                >
                  发送
                </button>
              </div>
            </div>
          </form>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useChat } from '~/composables/useChat'

const sidebarOpen = ref(false)
const isDark = ref(true)
const messagesEl = ref<HTMLElement | null>(null)
const copyHint = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const longPressTimer = ref<number | null>(null)
const longPressFired = ref(false)

const quickPrompts = [
  {
    id: 'code',
    label: '写代码',
    template:
      '你是资深工程师。请根据我的需求输出：\\n- 方案要点\\n- 代码实现\\n- 关键边界/注意事项\\n\\n需求：\\n',
  },
  {
    id: 'translate',
    label: '翻译',
    template:
      '请把下面内容翻译成中文（保留专业术语，可附简短注释），并给出一版更自然的口语化版本：\\n\\n原文：\\n',
  },
  {
    id: 'summary',
    label: '总结',
    template:
      '请对下面内容做结构化总结：\\n- 3~5 条要点\\n- 关键结论\\n- 待办事项（如有）\\n\\n内容：\\n',
  },
  {
    id: 'poem',
    label: '写诗',
    template:
      '请以“{主题}”为主题写一首中文诗（意象清晰，语言优美），并给出一句解释。\\n\\n主题：\\n',
  },
] as const

const {
  conversations,
  activeConversationId,
  messages,
  input,
  isStreaming,
  sendMessage,
  stopStreaming,
  newConversation,
  selectConversation,
  deleteConversation,
} = useChat()

const applyQuickPrompt = (template: string) => {
  input.value = template
  requestAnimationFrame(() => {
    inputEl.value?.focus()
    const len = input.value.length
    inputEl.value?.setSelectionRange(len, len)
  })
}

const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    copyHint.value = '已复制回答到剪贴板'
    setTimeout(() => {
      if (copyHint.value === '已复制回答到剪贴板') {
        copyHint.value = ''
      }
    }, 1500)
  } catch {
    // ignore clipboard failures silently
  }
}

const onAssistantTouchStart = (content: string) => {
  if (!content) return
  if (longPressTimer.value) {
    window.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  longPressFired.value = false
  longPressTimer.value = window.setTimeout(async () => {
    longPressFired.value = true
    await copyMessage(content)
  }, 450)
}

const onAssistantTouchEnd = () => {
  if (longPressTimer.value) {
    window.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

const scrollToBottom = async () => {
  await nextTick()
  requestAnimationFrame(() => {
    const el = messagesEl.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

const onNewConversation = async () => {
  await newConversation()
  sidebarOpen.value = false
  await scrollToBottom()
}

const onSelectConversation = async (id: string) => {
  await selectConversation(id)
  sidebarOpen.value = false
  await scrollToBottom()
}

const onDeleteConversation = async (id: string) => {
  await deleteConversation(id)
}

watch(
  () => messages.value.length,
  async () => {
    await scrollToBottom()
  },
)

watch(
  () => messages.value[messages.value.length - 1]?.content,
  async () => {
    // Stream updates also trigger scroll
    await scrollToBottom()
  },
)

onMounted(async () => {
  await scrollToBottom()
  if (process.client) {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      isDark.value = false
    }
  }
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (process.client) {
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }
}
</script>

