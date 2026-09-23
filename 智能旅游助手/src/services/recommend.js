import request from '@/utils/request'
import { useUserStore } from '@/store/user'

const controller = new AbortController()

/**
 * 获取旅游规划
 * @param {*} data 请求参数
 * @param {*} data.destination 目的地
 * @param {*} data.budget 预算
 * @param {*} data.days 天数
 * @returns 
 */
export const getTravelPlan = (data) => {
    return request({
        url: '/api/travel/recommend',
        method: 'post',
        data
    })
}

/**
 * 流式获取旅游问答内容
 * @param {string} prompt 用户问题
 * @param {(event: object) => void} onEvent SSE 事件回调
 */
export const streamTravelChat = async (prompt, onEvent) => {
    const baseURL = request.defaults.baseURL || window.location.origin
    const { token } = useUserStore()
    // 这里用原生 fetch 读取流，不经过 axios 拦截器，需手动携带令牌
    const response = await fetch(new URL('/api/travel/chat', baseURL), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.msg || `请求失败（${response.status}）`)
    }
    if (!response.body) {
        throw new Error('当前浏览器不支持流式响应')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const processEvent = (eventText) => {
        const data = eventText
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')

        if (!data) return
        const event = JSON.parse(data)
        onEvent(event)
        if (event.type === 'error') {
            throw new Error(event.msg || '模型服务调用失败')
        }
    }

    while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const events = buffer.split(/\r?\n\r?\n/)
        buffer = events.pop() || ''
        events.forEach(processEvent)

        if (done) {
            if (buffer.trim()) processEvent(buffer)
            break
        }
    }
}
