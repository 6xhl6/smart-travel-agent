import request from '@/utils/request'

/**
 * 上传用户头像（需登录，后端从请求头 token 中识别用户）
 * @param {FormData} formData 需包含 file（图片文件）
 * @returns {Promise<{ success: boolean, msg: string, data: object }>}
 */
export const uploadAvatar = (formData) => {
    return request({
        url: '/api/auth/avatar',
        method: 'post',
        data: formData,
    })
}

/**
 * 把后端返回的相对路径拼成可直接访问的完整地址
 * @param {string} avatar 例如 /uploads/xxx.png
 */
export const resolveAvatarUrl = (avatar) => {
    if (!avatar) return ''
    return new URL(avatar, request.defaults.baseURL).href
}

export const register = (username, password) => {
    return request({
        url: '/api/auth/register',
        method: 'post',
        data: { username, password },
    })
}

export const login = (username, password) => {
    return request({
        url: '/api/auth/login',
        method: 'post',
        data: { username, password },
    })
}

/**
 * 修改昵称（需登录）
 * @param {string} nickname 新昵称
 */
export const updateProfile = (nickname) => {
    return request({
        url: '/api/auth/profile',
        method: 'patch',
        data: { nickname },
    })
}

/**
 * 修改密码（需登录），成功后需重新登录
 * @param {string} oldPassword 原密码
 * @param {string} newPassword 新密码
 */
export const updatePassword = (oldPassword, newPassword) => {
    return request({
        url: '/api/auth/password',
        method: 'patch',
        data: { oldPassword, newPassword },
    })
}

/**
 * 注销账号（需登录），会一并删除该账号的收藏与历史记录
 */
export const removeAccount = () => {
    return request({
        url: '/api/auth/account',
        method: 'delete',
    })
}
