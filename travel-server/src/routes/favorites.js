import express from 'express'
import FavoriteService from '../services/FavoriteService.js'
import { sendSuccess, sendFail } from '../utils/response.js'
import { requireAuth } from '../middlewares/auth.js'

const router = express.Router()
const favoriteService = new FavoriteService()

// 收藏列表：只返回当前登录用户自己的记录
router.get('/', requireAuth, async (req, res) => {
    try {
        const list = await favoriteService.listByUser(req.userId)
        sendSuccess(res, list, '获取收藏列表成功')
    } catch (error) {
        console.error('获取收藏列表失败:', error.message)
        sendFail(res, '获取收藏列表失败，请稍后重试', 500)
    }
})

// 清空当前用户的全部收藏：不可恢复，前端需二次确认
router.delete('/', requireAuth, async (req, res) => {
    try {
        const count = await favoriteService.clearByUser(req.userId)
        sendSuccess(res, { count }, `已清空 ${count} 条收藏`)
    } catch (error) {
        console.error('清空收藏失败:', error.message)
        sendFail(res, '清空收藏失败，请稍后重试', 500)
    }
})

// 收藏详情：返回含行程快照的完整记录，详情页据此直接回显，不再重新生成
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const favorite = await favoriteService.getById(req.userId, req.params.id)
        sendSuccess(res, favorite, '获取收藏详情成功')
    } catch (error) {
        console.error('获取收藏详情失败:', error.message)
        sendFail(res, error.message, 404)
    }
})

// 新增收藏：参数与推荐接口保持一致，另附当前展示的行程快照；重复收藏不会产生第二条记录
router.post('/', requireAuth, async (req, res) => {
    try {
        const { destination, budget, days, plan } = req.body
        if (!destination || !budget || !days) {
            return sendFail(res, '参数错误！')
        }
        if (!plan || !Array.isArray(plan.dailyPlan)) {
            return sendFail(res, '行程数据不完整，无法收藏')
        }
        const favorite = await favoriteService.add(req.userId, { destination, budget, days, plan })
        sendSuccess(res, favorite, '收藏成功', 201)
    } catch (error) {
        console.error('添加收藏失败:', error.message)
        sendFail(res, '收藏失败，请稍后重试', 500)
    }
})

// 取消收藏
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await favoriteService.remove(req.userId, req.params.id)
        sendSuccess(res, null, '已取消收藏')
    } catch (error) {
        console.error('取消收藏失败:', error.message)
        sendFail(res, error.message, 404)
    }
})

export default router
