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
