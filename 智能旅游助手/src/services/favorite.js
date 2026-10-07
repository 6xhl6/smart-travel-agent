import request from '@/utils/request'

/**
 * 获取当前登录用户的收藏列表
 * @returns 接口返回数组，每项形如 { id, destination, budget, days, createdAt }
 */
export const getFavorites = () => {
    return request({
        url: '/api/favorites',
        method: 'get'
    })
}

/**
 * 获取单条收藏详情
 * 返回记录里带有收藏时保存的行程快照（plan），详情页直接回显，无需重新请求模型
 * @param {string} id 收藏记录 id
 */
export const getFavoriteDetail = (id) => {
    return request({
        url: `/api/favorites/${id}`,
        method: 'get'
    })
}

/**
 * 收藏一份规划
 * @param {{destination: string, budget: number|string, days: number|string, plan: object}} data
 *        plan 为当前详情页展示的完整行程数据
 */
export const addFavorite = (data) => {
    return request({
        url: '/api/favorites',
        method: 'post',
        data
    })
}

/**
 * 取消收藏
 * @param {string} id 收藏记录 id
 */
export const removeFavorite = (id) => {
    return request({
        url: `/api/favorites/${id}`,
        method: 'delete'
    })
}

/**
 * 清空当前用户的全部收藏（不可恢复）
 */
export const clearFavorites = () => {
    return request({
        url: '/api/favorites',
        method: 'delete'
    })
}
