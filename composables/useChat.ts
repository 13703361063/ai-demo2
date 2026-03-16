import { onMounted, ref } from 'vue'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ConversationsResponse {
  conversations: ChatConversation[]
}

interface ConversationResponse {
  conversation: ChatConversation
}

interface MessagesResponse {
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>
}

export function useChat() {
  const conversations = ref<ChatConversation[]>([])
  const activeConversationId = ref<string>('')
  const messages = ref<ChatMessage[]>([])

  const input = ref('')
  const isStreaming = ref(false)

  let abortController: AbortController | null = null

  const refreshConversations = async () => {
    const res = await $fetch<ConversationsResponse>('/api/conversations')
    conversations.value = res.conversations
  }

  const loadMessages = async (conversationId: string) => {
    const res = await $fetch<MessagesResponse>(`/api/conversations/${conversationId}/messages`)
    messages.value = res.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ id: m.id, role: m.role as ChatRole, content: m.content }))
  }

  const newConversation = async () => {
    const res = await $fetch<ConversationResponse>('/api/conversations', { method: 'POST' })
    activeConversationId.value = res.conversation.id
    messages.value = []
    await refreshConversations()
  }

  const selectConversation = async (id: string) => {
    activeConversationId.value = id
    input.value = ''
    await loadMessages(id)
  }

  const deleteConversation = async (id: string) => {
    await $fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (activeConversationId.value === id) {
      activeConversationId.value = ''
      messages.value = []
    }
    await refreshConversations()
    if (!activeConversationId.value) {
      const first = conversations.value[0]?.id
      if (first) {
        await selectConversation(first)
      } else {
        await newConversation()
      }
    }
  }

  const sendMessage = async () => {
    const trimmed = input.value.trim()
    if (!trimmed || isStreaming.value) return

    if (!activeConversationId.value) {
      await newConversation()
    }

    messages.value.push({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: trimmed,
    })
    input.value = ''

    const assistantMessage: ChatMessage = {
      id: `local-${Date.now()}-assistant`,
      role: 'assistant',
      content: '',
    }
    messages.value.push(assistantMessage)

    isStreaming.value = true
    abortController = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: activeConversationId.value,
          messages: messages.value.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        const contentType = response.headers.get('content-type') || ''
        let details = ''
        try {
          if (contentType.includes('application/json')) {
            const json = await response.json()
            details =
              json?.message ||
              json?.statusMessage ||
              json?.data?.message ||
              JSON.stringify(json)
          } else {
            details = await response.text()
          }
        } catch {
          // ignore
        }
        throw new Error(details || `Request failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')

      let assistantText = ''
      let buffer = ''
      let lastUiFlushAt = 0

      // SSE stream parsing
      // data: "xxx"\n\n
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process full lines only; keep remainder in buffer
        const lines = buffer.replace(/\r\n/g, '\n').split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith(':')) continue
          if (!line.startsWith('data: ')) continue
          const data = line.replace(/^data:\s*/, '').trim()

          if (data === '[DONE]') {
            isStreaming.value = false
            abortController = null
            if (activeConversationId.value) {
              await refreshConversations()
              await loadMessages(activeConversationId.value)
            }
            return
          }

          try {
            const delta = JSON.parse(data) as string
            assistantText += delta
            assistantMessage.content = assistantText
            // Force UI flush periodically so it feels truly streaming.
            const now = Date.now()
            if (now - lastUiFlushAt > 50) {
              lastUiFlushAt = now
              messages.value = [...messages.value]
            }
          } catch {
            // If JSON is split across chunks, push back to buffer
            buffer = `${line}\n${buffer}`
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Manually aborted, ignore
      } else {
        const message = error instanceof Error ? error.message : ''
        assistantMessage.content =
          assistantMessage.content ||
          (message ? `请求失败：${message}` : '对不起，服务暂时不可用，请稍后重试。')
      }
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  const stopStreaming = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  onMounted(async () => {
    await refreshConversations()
    const first = conversations.value[0]?.id
    if (first) {
      await selectConversation(first)
    } else {
      await newConversation()
    }
  })

  return {
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
  }
}

