import express from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import AuthService, { AuthError } from '../services/AuthService.js'
import { sendSuccess, sendFail } from '../utils/response.js'
import { requireAuth } from '../middlewares/auth.js'

const router = express.Router()
const authService = new AuthService()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 头像存放目录，通过 /uploads 静态访问
const avatarDir = path.join(__dirname, '../../public/uploads')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(avatarDir, { recursive: true })
            .then(() => cb(null, avatarDir))
            .catch((err) => cb(err))
    },
    // 用随机名避免同名覆盖，保留原扩展名
    filename: (req, file, cb) => {
        cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
    },
})

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('只允许上传图片文件'))
            return
        }
        cb(null, true)
    },
})

// 注册
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body || {}
        const user = await authService.register(username, password)
        sendSuccess(res, user, '注册成功', 201)
    } catch (error) {
        // 用户名已被占用：属业务预期内的分支，返回 200 并由 data.code 供前端区分
        if (error instanceof AuthError && error.code === 'USER_EXISTS') {
            sendFail(res, error.message, 200, { code: error.code })
            return
        }
        // 其余为参数校验失败等，仍按 400 返回
        sendFail(res, error.message || '注册失败')
    }
})

// 登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body || {}
        // 登录是获取 token 的接口，此时客户端还没有 token，因此不校验 Authorization
        const result = await authService.login(username, password)
        sendSuccess(res, result, '登录成功')
    } catch (error) {
        sendFail(res, error.message || '登录失败', 401)
    }
})

// 上传头像（需要登录，用户身份取自 token）
router.post('/avatar', requireAuth, (req, res) => {
    // 手动调用 multer，便于把上传错误统一转成 JSON
    upload.single('file')(req, res, async (uploadError) => {
        if (uploadError) {
            const msg = uploadError.code === 'LIMIT_FILE_SIZE'
                ? '图片大小不能超过 2MB'
                : uploadError.message || '头像上传失败'
            sendFail(res, msg)
            return
        }
        try {
            if (!req.file) {
                throw new Error('请选择要上传的图片')
            }
            // userId 来自已校验的 token，不接受客户端传入，避免越权修改他人头像
            const user = await authService.updateAvatar(req.userId, `/uploads/${req.file.filename}`)
            sendSuccess(res, user, '头像更新成功')
        } catch (error) {
            if (error instanceof AuthError && error.code === 'USER_NOT_FOUND') {
                sendFail(res, error.message, 200, { code: error.code })
                return
            }
            sendFail(res, error.message || '头像上传失败')
        }
    })
})

// 修改昵称
router.patch('/profile', requireAuth, async (req, res) => {
    try {
        const user = await authService.updateNickname(req.userId, req.body?.nickname)
        sendSuccess(res, user, '昵称修改成功')
    } catch (error) {
        sendFail(res, error.message || '昵称修改失败')
    }
})

// 修改密码：成功后原令牌不再代表新的凭证状态，前端会清掉登录态要求重新登录
router.patch('/password', requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body || {}
        await authService.updatePassword(req.userId, oldPassword, newPassword)
        sendSuccess(res, null, '密码修改成功，请重新登录')
    } catch (error) {
        sendFail(res, error.message || '密码修改失败')
    }
})

// 注销账号：连同该用户的收藏与历史一并删除，不可恢复
router.delete('/account', requireAuth, async (req, res) => {
    try {
        await authService.removeAccount(req.userId)
        sendSuccess(res, null, '账号已注销')
    } catch (error) {
        sendFail(res, error.message || '注销失败')
    }
})

export default router
