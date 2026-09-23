<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import { streamTravelChat } from '@/services/recommend.js'

const markdown = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true
})
// 洗牌随机选择3个问题
function pickRandom(arr, count = 3) {
    const copy = [...arr];
    const len = copy.length;
    const n = Math.min(count, len);

    // 只洗前 n 个，效率更高
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(Math.random() * (len - i));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, n);
}
// 灵感问题
const quickQuestions = [
    '第一次去成都，三天怎么安排？',
    '预算1000元，广州周末怎么玩？',
    '带父母去杭州有哪些轻松路线？',
    '第一次去北京，五天怎么安排比较顺？',
    '上海周末两日游，怎么玩不踩雷？',
    '学生党去西安，三天人均800够吗？',
    '情侣去厦门，三天两晚怎么安排？',
    '带小孩去上海迪士尼，住哪里方便？',
    '重庆三天两晚，怎么吃怎么玩？',
    '长沙周末怎么玩？求美食路线推荐。',
    '第一次去云南，昆明大理丽江怎么串？',
    '去三亚五天，预算5000元怎么玩？',
    '南京两天一夜，有哪些必去景点？',
    '苏州周末游，怎么安排园林和美食？',
    '青岛三天怎么玩？想看海和吃海鲜。'
]
// 随机选取的问题
const randomQuestions = ref(pickRandom(quickQuestions))
// 换一批灵感问题
const refreshRandomQuestions = () => {
    randomQuestions.value = pickRandom(quickQuestions)
}

const input = ref('')
const isSending = ref(false)
const messageList = ref(null)
let messageId = 0
let scrollFrame = null

const getTime = () => new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
}).format(new Date())

const createWelcomeMessage = () => ({
    id: ++messageId,
    role: 'assistant',
    content: '你好，今天想去哪里？',
    time: getTime()
})

const messages = ref([createWelcomeMessage()])
const canSend = computed(() => input.value.trim().length > 0 && !isSending.value)
const hasConversation = computed(() => messages.value.some((message) => message.role === 'user'))

const renderMarkdown = (content) => DOMPurify.sanitize(markdown.render(content || ''))

const scrollToBottom = () => {
    if (scrollFrame) return
    scrollFrame = requestAnimationFrame(() => {
        nextTick(() => {
            if (messageList.value) {
                messageList.value.scrollTop = messageList.value.scrollHeight
            }
            scrollFrame = null
        })
    })
}

const clearConversation = () => {
    if (isSending.value) return
    messages.value = [createWelcomeMessage()]
    input.value = ''
}

const sendMessage = async (question = input.value) => {
    const prompt = question.trim()
    if (!prompt || isSending.value) return

    const userMessage = {
        id: ++messageId,
        role: 'user',
        content: prompt,
        time: getTime()
    }
    const assistantMessage = reactive({
        id: ++messageId,
        role: 'assistant',
        content: '',
        time: getTime(),
        pending: true,
        failed: false
    })

    messages.value.push(userMessage, assistantMessage)
    input.value = ''
    isSending.value = true
    scrollToBottom()

    try {
        await streamTravelChat(prompt, (event) => {
            if (event.type === 'chunk') {
                assistantMessage.content += event.content || ''
            }
            if (event.type === 'complete') {
                assistantMessage.content = event.data?.reply || assistantMessage.content
                assistantMessage.pending = false
            }
            scrollToBottom()
        })
    } catch (error) {
        assistantMessage.pending = false
        assistantMessage.failed = true
        if (!assistantMessage.content) {
            assistantMessage.content = '暂时没有获取到回答，请稍后重新尝试。'
        }
        showToast(error.message || '发送失败，请稍后重试')
    } finally {
        assistantMessage.pending = false
        isSending.value = false
        scrollToBottom()
    }
}

onBeforeUnmount(() => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame)
})
</script>

<template>
    <div class="dialog-page">
        <van-nav-bar class="dialog-nav" title="旅行问答">
            <template #right>
                <van-icon v-if="hasConversation" class="clear-button" name="delete-o" role="button" tabindex="0"
                    title="清空对话" aria-label="清空对话" @click="clearConversation" @keydown.enter="clearConversation" />
            </template>
        </van-nav-bar>

        <div ref="messageList" class="message-list" aria-live="polite">
            <div class="status-row">
                <span class="status-dot"></span>
                AI 旅行助手在线
            </div>

            <div v-for="message in messages" :key="message.id" class="message-row" :class="message.role">
                <div class="avatar" :class="message.role">
                    <span v-if="message.role === 'assistant'">AI</span>
                    <van-icon v-else name="user-o" />
                </div>

                <div class="message-column">
                    <div class="message-meta">
                        <span>{{ message.role === 'assistant' ? '旅行助手' : '我' }}</span>
                        <time>{{ message.time }}</time>
                    </div>
                    <div class="message-bubble" :class="{ failed: message.failed }">
                        <div v-if="message.role === 'assistant' && message.content" class="message-markdown"
                            v-html="renderMarkdown(message.content)"></div>
                        <p v-else-if="message.content" class="plain-message">{{ message.content }}</p>
                        <div v-if="message.pending" class="typing-indicator" aria-label="正在生成">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <span v-if="message.failed" class="message-error">回答未完整生成</span>
                </div>
            </div>

            <section v-if="!hasConversation" class="quick-questions">
                <div class="quick-title">
                    <van-icon name="bulb-o" />
                    灵感
                    <div class="refresh-button" @click="refreshRandomQuestions">
                        <van-icon name="exchange" />
                        换一批
                    </div>
                </div>
                <button v-for="question in randomQuestions" :key="question" type="button"
                    @click="sendMessage(question)">
                    <span>{{ question }}</span>
                    <van-icon name="arrow" />
                </button>
            </section>
        </div>

        <div class="composer">
            <van-field v-model="input" class="message-input" type="textarea" rows="1"
                :autosize="{ maxHeight: 96, minHeight: 24 }" maxlength="500" placeholder="问问目的地、行程或预算"
                :disabled="isSending" @focus="scrollToBottom" @keydown.enter.exact.prevent="sendMessage()" />
            <van-button class="send-button" type="primary" :disabled="!canSend" :loading="isSending"
                loading-type="spinner" icon="guide-o" title="发送消息" aria-label="发送消息" @click="sendMessage()" />
        </div>
    </div>
</template>

<style scoped>
.dialog-page {
    height: calc(100dvh - 50px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #2f3337;
    background-color: #f3f5f7;
}

.dialog-nav {
    flex: 0 0 46px;
    border-bottom: 1px solid #eceff2;
}

.clear-button {
    padding: 8px;
    font-size: 20px;
    color: #60656b;
    cursor: pointer;
}

.message-list {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 12px 12px 20px;
    scroll-behavior: smooth;
}

.status-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 16px;
    font-size: 11px;
    line-height: 18px;
    color: #8b9198;
}

.status-dot {
    width: 7px;
    height: 7px;
    background-color: #07a85a;
    border-radius: 50%;
}

.message-row {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-bottom: 18px;
}

.message-row.user {
    flex-direction: row-reverse;
}

.avatar {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    border-radius: 8px;
}

.avatar.assistant {
    color: #fff;
    background-color: #245c8f;
}

.avatar.user {
    font-size: 19px;
    color: #166fc2;
    background-color: #e7f2fc;
}

.message-column {
    max-width: min(82%, 620px);
    min-width: 0;
}

.message-row.user .message-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.message-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
    font-size: 11px;
    line-height: 17px;
    color: #969ba1;
}

.message-row.user .message-meta {
    flex-direction: row-reverse;
}

.message-meta span {
    font-weight: 500;
    color: #60656b;
}

.message-bubble {
    box-sizing: border-box;
    padding: 10px 12px;
    background-color: #fff;
    border: 1px solid #e8ebef;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgb(31 41 55 / 4%);
}

.message-row.user .message-bubble {
    color: #fff;
    background-color: #1989fa;
    border-color: #1989fa;
}

.message-bubble.failed {
    border-color: #f4c4c4;
}

.plain-message {
    margin: 0;
    font-size: 14px;
    line-height: 22px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.message-markdown {
    min-width: 0;
    font-size: 14px;
    line-height: 1.7;
    color: #34393f;
    overflow-wrap: anywhere;
}

.message-markdown :deep(h1),
.message-markdown :deep(h2),
.message-markdown :deep(h3) {
    margin: 14px 0 7px;
    font-size: 16px;
    line-height: 24px;
}

.message-markdown :deep(h1:first-child),
.message-markdown :deep(h2:first-child),
.message-markdown :deep(h3:first-child),
.message-markdown :deep(p:first-child) {
    margin-top: 0;
}

.message-markdown :deep(p) {
    margin: 7px 0;
}

.message-markdown :deep(p:last-child) {
    margin-bottom: 0;
}

.message-markdown :deep(ul),
.message-markdown :deep(ol) {
    margin: 7px 0;
    padding-left: 20px;
}

.message-markdown :deep(blockquote) {
    margin: 9px 0;
    padding: 6px 10px;
    color: #60656b;
    background-color: #f4f7f9;
    border-left: 3px solid #8eb9dc;
}

.message-markdown :deep(code) {
    padding: 2px 4px;
    font-size: 12px;
    background-color: #f0f2f4;
    border-radius: 4px;
}

.message-markdown :deep(pre) {
    max-width: 100%;
    overflow-x: auto;
    margin: 9px 0;
    padding: 10px;
    background-color: #f0f2f4;
    border-radius: 6px;
}

.message-markdown :deep(pre code) {
    padding: 0;
    background-color: transparent;
}

.message-markdown :deep(table) {
    width: 100%;
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
    font-size: 12px;
}

.message-markdown :deep(th),
.message-markdown :deep(td) {
    min-width: 72px;
    padding: 6px 8px;
    border: 1px solid #dfe3e7;
    text-align: left;
}

.message-markdown :deep(a) {
    color: #1989fa;
}

.typing-indicator {
    height: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 42px;
}

.typing-indicator span {
    width: 5px;
    height: 5px;
    background-color: #8b9198;
    border-radius: 50%;
    animation: typing 1.2s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
    animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
    animation-delay: 0.3s;
}

.message-error {
    margin-top: 5px;
    font-size: 11px;
    line-height: 17px;
    color: #ee5c5c;
}

.quick-questions {
    margin-left: 43px;
    padding-top: 2px;
}

.quick-title {
    display: flex;
    position: relative;
    align-items: center;
    gap: 5px;
    margin-bottom: 8px;
    font-size: 12px;
    line-height: 18px;
    color: #737980;
    .refresh-button {
        position: absolute;
        right: 0;
        top: 0;
        padding-right: 8px;
    }
}

.quick-title :deep(.van-icon) {
    color: #ed9b24;
}

.quick-questions button {
    width: min(100%, 430px);
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    padding: 8px 11px;
    text-align: left;
    font: inherit;
    font-size: 13px;
    line-height: 20px;
    color: #3f444a;
    background-color: #fff;
    border: 1px solid #e2e6ea;
    border-radius: 6px;
}

.quick-questions button:active {
    background-color: #f7f9fb;
}

.quick-questions button span {
    min-width: 0;
    overflow-wrap: anywhere;
}

.quick-questions button :deep(.van-icon) {
    flex: 0 0 auto;
    color: #969ba1;
}

.composer {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 9px;
    box-sizing: border-box;
    padding: 9px 12px;
    background-color: #fff;
    border-top: 1px solid #e8ebef;
}

.message-input {
    flex: 1;
    min-width: 0;
    padding: 8px 11px;
    background-color: #f4f6f8;
    border: 1px solid #e4e7eb;
    border-radius: 8px;
}

.message-input :deep(.van-field__control) {
    line-height: 22px;
}

.send-button {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    padding: 0;
    border-radius: 50%;
}

.send-button :deep(.van-icon) {
    font-size: 19px;
}

@keyframes typing {

    0%,
    60%,
    100% {
        opacity: 0.35;
        transform: translateY(0);
    }

    30% {
        opacity: 1;
        transform: translateY(-3px);
    }
}

@media (min-width: 768px) {

    .message-list,
    .composer {
        padding-right: max(18px, calc((100% - 760px) / 2));
        padding-left: max(18px, calc((100% - 760px) / 2));
    }
}

@media (max-width: 360px) {
    .message-list {
        padding-right: 8px;
        padding-left: 8px;
    }

    .message-column {
        max-width: calc(100% - 43px);
    }

    .quick-questions {
        margin-left: 0;
    }

    .composer {
        padding-right: 8px;
        padding-left: 8px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .message-list {
        scroll-behavior: auto;
    }

    .typing-indicator span {
        animation: none;
    }
}
</style>
