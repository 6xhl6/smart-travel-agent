import { randomUUID } from 'crypto'
import { getDB } from '../data/db.js'

class FavoriteService {
    // 数据库实例由 data/db.js 统一提供，与其它 Service 共享同一份内存数据
    async ensureReady() {
        return getDB()
    }
    // 收藏列表：按收藏时间倒序，最近收藏的排在最前
    // 列表只返回摘要，完整的行程快照体积较大，留到查看详情时再按 id 获取
    async listByUser(userId) {
        const db = await this.ensureReady()
        return db.data.favorites
            .filter((item) => item.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(({ plan, ...summary }) => summary)
    }
    // 收藏详情：返回包含行程快照的完整记录，供详情页直接回显
    async getById(userId, id) {
        const db = await this.ensureReady()
        const favorite = db.data.favorites.find(
            (item) => item.id === id && item.userId === userId
        )
        if (!favorite) {
            throw new Error('收藏记录不存在')
        }
        return favorite
    }
    // 新增收藏：连同当前展示的行程快照一起存下来，之后点击直接回显，不再重新调用模型
    async add(userId, { destination, budget, days, plan }) {
        const db = await this.ensureReady()
        const info = this.normalize({ destination, budget, days })
        // 同一用户下的同一份规划只保留一条，重复收藏时用最新的快照覆盖
        const exists = db.data.favorites.find(
            (item) => item.userId === userId && this.isSamePlan(item, info)
        )
        if (exists) {
            exists.plan = plan
            exists.createdAt = new Date().toISOString()
            await db.write()
            return exists
        }
        const favorite = {
            id: randomUUID(),
            userId,
            ...info,
            plan,
            createdAt: new Date().toISOString()
        }
        db.data.favorites.push(favorite)
        await db.write()
        return favorite
    }
    // 取消收藏：只能删除属于自己的记录
    async remove(userId, id) {
        const db = await this.ensureReady()
        const index = db.data.favorites.findIndex(
            (item) => item.id === id && item.userId === userId
        )
        if (index === -1) {
            throw new Error('收藏记录不存在')
        }
        const [removed] = db.data.favorites.splice(index, 1)
        await db.write()
        return removed
    }
    // 清空该用户的全部收藏，返回被清掉的条数
    async clearByUser(userId) {
        const db = await this.ensureReady()
        const before = db.data.favorites.length
        db.data.favorites = db.data.favorites.filter((item) => item.userId !== userId)
        await db.write()
        return before - db.data.favorites.length
    }
    // 参数归一化，避免 "3000" 与 3000 被当成两份不同的规划
    normalize({ destination, budget, days }) {
        return {
            destination: String(destination).trim(),
            budget: Number(budget),
            days: Number(days)
        }
    }
    // 判断收藏记录与给定参数是否指向同一份规划
    isSamePlan(item, plan) {
        return item.destination === plan.destination
            && Number(item.budget) === plan.budget
            && Number(item.days) === plan.days
    }
}

export default FavoriteService
