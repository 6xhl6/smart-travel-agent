import { JSONFilePreset } from 'lowdb/node'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 令牌有效期：过期后前端会收到 401，需要重新登录
const TOKEN_TTL = '1h'

// 带业务错误码的异常，便于路由层区分处理
export class AuthError extends Error {
    constructor(message, code) {
        super(message)
        this.name = 'AuthError'
        this.code = code
    }
}

class AuthService {
    constructor() {
        this.db = null
        this.ready = this.initDB()
    }
    // 初始化 lowdb 数据库
    async initDB() {
        const dir = path.join(__dirname, '../data')
        // 确保数据目录存在
        await fs.mkdir(dir, { recursive: true })
        const file = path.join(dir, 'db.json')
        const db = await JSONFilePreset(file, { users: [] })
        db.data.users ||= []
        this.db = db
        return db
    }
    // 等待数据库就绪
    async ensureReady() {
        if (!this.db) {
            await this.ready
        }
        return this.db
    }
    // 注册用户
    async register(username, password) {
        const nameReg = /^[a-zA-Z0-9_]{3,20}$/
        const passwordReg = /^[a-zA-Z0-9]{6,15}$/
        const name = username.trim()
        if (!name || !password.trim()) {
            throw new Error('用户名和密码不能为空')
        }
        if (!nameReg.test(name)) {
            throw new Error('用户名只能包含字母、数字和下划线，长度需在 3-20 个字符之间')
        }
        if (!passwordReg.test(password)) {
            throw new Error('密码只能包含字母、数字，长度需在 6-15 位之间')
        }
        const db = await this.ensureReady()
        const exists = db.data.users.some((user) => user.username === name)
        if (exists) {
            throw new AuthError('该用户名已被注册', 'USER_EXISTS')
        }
        const passwordHash = await bcrypt.hash(password, 10)
        // 创建用户记录
        const user = {
            id: randomUUID(),
            username: name,
            passwordHash,
            nickname: name,
            avatar: '',
            createdAt: new Date().toISOString(),
        }
        db.data.users.push(user)
        await db.write()
        // 返回脱敏后的用户信息
        return this.sanitize(user)
    }
    // 登录用户
    async login(username, password) {
        if (!username || !password) {
            throw new Error('用户名和密码不能为空')
        }
        const db = await this.ensureReady()
        const user = db.data.users.find((u) => u.username === username.trim())
        if (!user) {
            throw new Error('用户名或密码错误')
        }
        // 密码解密并校验
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
            throw new Error('用户名或密码错误')
        }
        // 签发令牌，过期校验交给接口层的 requireAuth 中间件
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: TOKEN_TTL,
        })
        return { token, user: this.sanitize(user) }
    }
    // 根据 id 查询用户
    async findById(id) {
        const db = await this.ensureReady()
        const user = db.data.users.find((u) => u.id === id)
        return user ? this.sanitize(user) : null
    }
    // 更新用户头像
    async updateAvatar(userId, avatarUrl) {
        if (!userId) {
            throw new Error('缺少用户标识')
        }
        const db = await this.ensureReady()
        const user = db.data.users.find((u) => u.id === userId)
        if (!user) {
            throw new AuthError('用户不存在', 'USER_NOT_FOUND')
        }
        user.avatar = avatarUrl
        await db.write()
        return this.sanitize(user)
    }
    // 去掉敏感字段
    sanitize(user) {
        const { passwordHash, ...safe } = user
        return safe
    }
}

export default AuthService