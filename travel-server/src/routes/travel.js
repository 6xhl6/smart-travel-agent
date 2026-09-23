import express from 'express'
import TravelService from '../services/TravelService.js'
import { streamResponse } from '../utils/streaming.js'
import { sendSuccess, sendFail } from '../utils/response.js'
import { requireAuth } from '../middlewares/auth.js'

const router = express.Router()
const travelService = new TravelService()

// 相同参数的推荐结果缓存 10 分钟：刷新页面、重复提交或他人请求同样参数时
// 直接复用，避免反复调用大模型（一次生成要 30~70 秒）
const PLAN_CACHE_TTL = 10 * 60 * 1000
const planCache = new Map()

// 参数做归一化，避免 "3000" 与 3000 被当成两个不同的键
const buildPlanCacheKey = (userId, destination, budget, days) =>
    `User:${String(userId)}|${String(destination).trim()}|${Number(budget)}|${Number(days)}`

const readPlanCache = (key) => {
    const item = planCache.get(key)
    if (!item) return null
    if (Date.now() - item.time > PLAN_CACHE_TTL) {
        planCache.delete(key)
        return null
    }
    return item.plan
}

const writePlanCache = (key, plan) => {
    // 顺带清掉过期项，避免长期运行后缓存无限增长
    const now = Date.now()
    planCache.forEach((item, cacheKey) => {
        if (now - item.time > PLAN_CACHE_TTL) {
            planCache.delete(cacheKey)
        }
    })
    planCache.set(key, { time: now, plan })
}

router.post('/recommend', requireAuth, async (req, res) => {
    try {
        const { destination, budget, days } = req.body
        if (!destination || !budget || !days) {
            return sendFail(res, '参数错误！')
        }
        // 查找缓存结果
        const cacheKey = buildPlanCacheKey(req.userId, destination, budget, days)
        const cachedPlan = readPlanCache(cacheKey)
        if (cachedPlan) {
            return sendSuccess(res, cachedPlan, '获取推荐信息成功')
        }
        // 调用模型获取推荐信息
        const response = await travelService.recommend(destination, budget, days)
        // 只缓存结构完整的行程，参数不合法时返回的 Error 对象不写入缓存
        if (Array.isArray(response?.dailyPlan)) {
            writePlanCache(cacheKey, response)
        }
        sendSuccess(res, response, '获取推荐信息成功')
    } catch (error) {
        console.error('获取推荐信息失败:', error.message)
        const isInsufficientBalance = error.status === 402
        sendFail(
            res,
            isInsufficientBalance
                ? '模型服务余额不足，请充值或更换 API Key 后重试'
                : '模型服务调用失败，请稍后重试',
            isInsufficientBalance ? 402 : 502
        )
    }
})
router.post('/chat', requireAuth, async (req, res) => {
    if (!req.body.prompt) {
        return sendFail(res, '参数错误！')
    }
    const stream = streamResponse(res)
    try {
        const result = await travelService.chat(req.body.prompt, (chunk) => {
            stream.send({ type: 'chunk', content: chunk })
        })
        if (!result.success) {
            return stream.error(new Error(result.error))
        }
        stream.end(result)
    } catch (error) {
        console.error('聊天流式传输失败:', error.message)
        stream.error(error)
    }
})
export default router
