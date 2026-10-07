import request from '@/utils/request'

/**
 * 获取当前登录用户的历史记录列表
 * @returns 接口返回数组，每项形如 { id, destination, budget, days, createdAt }
 */
export const getHistories = () => {
    return request({
        url: '/api/histories',
        method: 'get'
    })
}

/**
 * 获取单条历史详情
 * 返回记录里带有生成时保存的行程快照（plan），详情页直接回显，无需重新请求模型
 * @param {string} id 历史记录 id
 */
export const getHistoryDetail = (id) => {
    return request({
        url: `/api/histories/${id}`,
        method: 'get'
    })
}

/**
 * 删除单条历史记录
 * @param {string} id 历史记录 id
 */
export const removeHistory = (id) => {
    return request({
        url: `/api/histories/${id}`,
        method: 'delete'
    })
}

/**
 * 清空当前用户的全部历史记录（不可恢复）
 */
export const clearHistories = () => {
    return request({
        url: '/api/histories',
        method: 'delete'
    })
}
