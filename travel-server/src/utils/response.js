/**
 * 统一 JSON 响应格式：第一层固定为 { success, msg, data }
 * - success: 业务是否成功
 * - msg:     可直接展示给用户的提示文案
 * - data:    业务数据，无数据时为 null；需要透出业务码时放在 data.code
 */

/**
 * 返回成功响应
 * @param {import('express').Response} res
 * @param {*} [data] 业务数据
 * @param {string} [msg] 提示文案
 * @param {number} [status] HTTP 状态码
 */
export const sendSuccess = (res, data = null, msg = '操作成功', status = 200) => {
    res.status(status).json({ success: true, msg, data })
}

/**
 * 返回失败响应
 * @param {import('express').Response} res
 * @param {string} [msg] 提示文案
 * @param {number} [status] HTTP 状态码
 * @param {*} [data] 业务数据，例如 { code: 'USER_EXISTS' }
 */
export const sendFail = (res, msg = '操作失败', status = 400, data = null) => {
    res.status(status).json({ success: false, msg, data })
}
