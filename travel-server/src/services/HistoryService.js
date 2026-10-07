import { randomUUID } from 'crypto'
import { getDB } from '../data/db.js'

class HistoryService {
    // 数据库实例由 data/db.js 统一提供，与其它 Service 共享同一份内存数据
    async ensureReady() {
        return getDB()
    }
    // 历史列表：按生成时间倒序，最近生成的排在最前
    // 列表只返回摘要，完整的行程快照体积较大，留到查看详情时再按 id 获取
    async listByUser(userId) {
        const db = await this.ensureReady()
        return db.data.histories
            .filter((item) => item.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(({ plan, ...summary }) => summary)
    }
    // 历史详情：返回包含行程快照的完整记录，供详情页直接回显
    async getById(userId, id) {
        const db = await this.ensureReady()
        const history = db.data.histories.find(
            (item) => item.id === id && item.userId === userId
        )
        if (!history) {
            throw new Error('历史记录不存在')
        }
        return history
    }
    // 写入历史：每次生成行程后自动调用，连同行程快照一起存下来
    // 同一份规划只保留一条，重复生成时用最新快照覆盖并把时间刷新到最新
    async add(userId, { destination, budget, days, plan }) {
        const db = await this.ensureReady()
        const info = this.normalize({ destination, budget, days })
        const exists = db.data.histories.find(
            (item) => item.userId === userId && this.isSamePlan(item, info)
        )
        if (exists) {
            exists.plan = plan
            exists.createdAt = new Date().toISOString()
            await db.write()
            return exists
        }
        const history = {
            id: randomUUID(),
            userId,
            ...info,
            plan,
            createdAt: new Date().toISOString()
        }
        db.data.histories.push(history)
        await db.write()
        return history
    }
    // 删除历史：只能删除属于自己的记录
    async remove(userId, id) {
        const db = await this.ensureReady()
        const index = db.data.histories.findIndex(
            (item) => item.id === id && item.userId === userId
        )
        if (index === -1) {
            throw new Error('历史记录不存在')
        }
        const [removed] = db.data.histories.splice(index, 1)
        await db.write()
        return removed
    }
    // 清空该用户的全部历史记录，返回被清掉的条数
    async clearByUser(userId) {
        const db = await this.ensureReady()
        const before = db.data.histories.length
        db.data.histories = db.data.histories.filter((item) => item.userId !== userId)
        await db.write()
        return before - db.data.histories.length
    }
    // 参数归一化，避免 "3000" 与 3000 被当成两份不同的规划
    normalize({ destination, budget, days }) {
        return {
            destination: String(destination).trim(),
            budget: Number(budget),
            days: Number(days)
        }
    }
    // 判断历史记录与给定参数是否指向同一份规划
    isSamePlan(item, plan) {
        return item.destination === plan.destination
            && Number(item.budget) === plan.budget
            && Number(item.days) === plan.days
    }
}

export default HistoryService
