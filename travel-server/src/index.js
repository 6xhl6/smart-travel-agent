import express from 'express'
import travelRouter from './routes/travel.js'
import authRouter from './routes/auth.js'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { sendSuccess, sendFail } from './utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const port = process.env.PORT || 3000
//添加json解析器中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
//托管上传的静态资源（头像等）
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')))
app.get('/heartbeat', (req, res) => {
  sendSuccess(res, null, '服务正常运行')
})
//添加路由中间件
app.use('/api/travel', travelRouter)
app.use('/api/auth', authRouter)
//未匹配到路由时也返回统一格式，避免前端收到 HTML 错误页
app.use((req, res) => {
  sendFail(res, `接口不存在：${req.method} ${req.originalUrl}`, 404)
})
//兜底错误处理，保证未捕获异常同样走统一格式
app.use((error, req, res, next) => {
  console.error('服务异常:', error.message)
  if (res.headersSent) {
    next(error)
    return
  }
  sendFail(res, '服务器内部错误，请稍后重试', 500)
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
