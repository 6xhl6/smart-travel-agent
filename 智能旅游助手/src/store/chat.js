import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const getTime = () => new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
}).format(new Date())

/**
 * 对话消息：放在 store 里而不是组件内，设置页才能清空对话记录
 * 不做持久化，刷新页面即重新开始，避免聊天内容长期留在本地
 */
export const useChatStore = defineStore('chat', () => {
    let messageId = 0
    const nextId = () => ++messageId

    const createWelcomeMessage = () => ({
        id: nextId(),
        role: 'assistant',
        content: '你好，今天想去哪里？',
        time: getTime()
    })

    const messages = ref([createWelcomeMessage()])
    const hasConversation = computed(() => messages.value.some((message) => message.role === 'user'))

    const addMessage = (...items) => {
        messages.value.push(...items)
    }
    const clearConversation = () => {
        messages.value = [createWelcomeMessage()]
    }

    return { messages, hasConversation, nextId, addMessage, clearConversation }
})
