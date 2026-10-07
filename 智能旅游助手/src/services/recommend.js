import request, { handleAuthExpired } from '@/utils/request'
import { useUserStore } from '@/store/user'

const controller = new AbortController()
class AuthError extends Error {
    constructor(message, code) {
        super(message)
        this.code = code
    }
}

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
 * 获取目的地候选列表
 * @returns 接口返回 { text, value } 结构，可直接作为 van-picker 的 columns
 */
export const getCities = () => {
    return request({
        url: '/api/travel/cities',
        method: 'get'
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
    let response
    try {
        response = await fetch(new URL('/api/travel/chat', baseURL), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ prompt }),
            signal: controller.signal
        })
    } catch (error) {
        throw new Error('网络异常，请检查网络连接', { cause: error })
    }

    if (!response.ok) {
        // 令牌过期：原生 fetch 不经过 axios 拦截器，这里手动走同一套过期处理
        if (response.status === 401) {
            handleAuthExpired()
            const error = new Error('登录状态已过期，请重新登录')
            // 确认框已经弹过，调用方不必再弹一次 toast
            error.silent = true
            throw error
        }
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
            throw new AuthError(event.msg || '模型服务调用失败', event.code || 500)
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
