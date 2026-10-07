import express from 'express'
import HistoryService from '../services/HistoryService.js'
import { sendSuccess, sendFail } from '../utils/response.js'
import { requireAuth } from '../middlewares/auth.js'

const router = express.Router()
const historyService = new HistoryService()

// 历史列表：只返回当前登录用户自己的记录
router.get('/', requireAuth, async (req, res) => {
    try {
        const list = await historyService.listByUser(req.userId)
        sendSuccess(res, list, '获取历史记录成功')
    } catch (error) {
        console.error('获取历史记录失败:', error.message)
        sendFail(res, '获取历史记录失败，请稍后重试', 500)
    }
})

// 清空当前用户的全部历史记录：不可恢复，前端需二次确认
router.delete('/', requireAuth, async (req, res) => {
    try {
        const count = await historyService.clearByUser(req.userId)
        sendSuccess(res, { count }, `已清空 ${count} 条记录`)
    } catch (error) {
        console.error('清空历史记录失败:', error.message)
        sendFail(res, '清空历史记录失败，请稍后重试', 500)
    }
})

// 历史详情：返回含行程快照的完整记录，详情页据此直接回显，不再重新生成
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const history = await historyService.getById(req.userId, req.params.id)
        sendSuccess(res, history, '获取历史详情成功')
    } catch (error) {
        console.error('获取历史详情失败:', error.message)
        sendFail(res, error.message, 404)
    }
})

// 删除单条历史记录
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await historyService.remove(req.userId, req.params.id)
        sendSuccess(res, null, '已删除该记录')
    } catch (error) {
        console.error('删除历史记录失败:', error.message)
        sendFail(res, error.message, 404)
    }
})

export default router
