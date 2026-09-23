import jwt from 'jsonwebtoken'
import { sendFail } from '../utils/response.js'

export const requireAuth = (req, res, next) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
        sendFail(res, '登录状态无效，请重新登录', 401)
        return
    }
    try {
        const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
        req.userId = payload.userId
        next()
    } catch {
        sendFail(res, '登录状态已过期，请重新登录', 401)
    }
}
