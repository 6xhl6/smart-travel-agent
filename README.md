# 智能旅游助手 (smart-travel-agent)

基于 Vue 3 + Express + LangChain 的 AI 智能旅游规划助手：输入目的地、预算与天数，自动生成结构化行程、预算明细与流式对话问答。

## 功能特性

- **AI 行程规划**：输入目的地、预算、天数，调用大模型生成结构化 JSON 行程（每日上午/下午/晚上安排、住宿推荐、三餐建议、六类目预算明细）
- **预算明细下钻**：以折叠面板展示住宿、餐饮、交通、门票、购物、其他六类目，每项可展开查看逐日明细
- **流式 AI 对话**：基于 SSE 的实时增量输出，边生成边展示
- **用户体系**：注册登录（bcrypt 加密存储密码、JWT 鉴权）、头像上传、退出登录
- **结果缓存**：相同参数 10 分钟内按用户隔离缓存，避免重复调用大模型（一次生成需 30~70 秒）

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前端 | Vue 3.5、Vite 8、Vant 4、Vue Router 5、Pinia（pinia-plugin-persistedstate）、Axios、markdown-it + DOMPurify、unplugin-auto-import / unplugin-vue-components |
| 后端 | Node.js、Express 4、LangChain（@langchain/openai）、jsonwebtoken、bcryptjs、lowdb 7、multer、nodemon |

## 目录结构

```
smart-travel-agent/
├── travel-server/              # 后端服务
│   ├── public/uploads/         # 头像等上传文件（不入库，仅保留 .gitkeep）
│   ├── src/
│   │   ├── data/db.json        # lowdb 数据文件（首次启动自动创建，不入库）
│   │   ├── middlewares/auth.js # JWT 鉴权中间件
│   │   ├── routes/             # auth.js（用户）、travel.js（行程）
│   │   ├── services/           # AuthService.js、TravelService.js（提示词与模型调用）
│   │   ├── utils/              # response.js（统一响应）、streaming.js（SSE）
│   │   └── index.js            # 服务入口
│   ├── .env.example            # 环境变量模板
│   └── .gitignore
└── 智能旅游助手/                # 前端应用
    ├── src/
    │   ├── router/             # 路由：/home、/dialog、/my、/login、/register、/detail
    │   ├── services/           # auth.js、recommend.js（含 SSE 读取）
    │   ├── store/              # Pinia，token 与用户信息（持久化）
    │   ├── utils/request.js    # axios 实例与请求/响应拦截器
    │   └── views/              # 页面组件
    └── vite.config.js
```

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`（Vite 8 的要求）
- npm
- 一个兼容 OpenAI 协议的大模型服务 API Key（默认接入硅基流动 SiliconFlow，同时支持 DeepSeek）

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/6xhl6/smart-travel-agent.git
cd smart-travel-agent
```

### 2. 启动后端

```bash
cd travel-server
npm install
```

复制环境变量模板，然后填入自己的配置（Windows 用 `copy`，macOS / Linux 用 `cp`）：

```bash
copy .env.example .env
```

编辑 `travel-server/.env`，至少需要填写以下三项：

- `MODEL_PROVIDER`：模型服务商，可选 `siliconflow` 或 `deepseek`
- 对应服务商的 `*_API_KEY`：例如 `MODEL_PROVIDER=siliconflow` 时填 `SILICONFLOW_API_KEY`
- `JWT_SECRET`：签发令牌的密钥，可用以下命令生成一个随机串

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

启动服务：

```bash
npm run dev    # 开发模式，nodemon 自动重启
npm start      # 直接运行
```

看到 `Example app listening at http://localhost:3500` 即启动成功。可用 `GET http://localhost:3500/heartbeat` 做健康检查。

### 3. 启动前端

```bash
cd 智能旅游助手
npm install
npm run dev
```

浏览器打开终端提示的地址（Vite 默认 `http://localhost:5173`）。

> 前端请求的后端地址在 `src/utils/request.js` 中配置为 `http://localhost:3500`。如果后端端口不同，需要同步修改该文件的 `baseURL`。

## 环境变量说明

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `PORT` | 后端监听端口 | `3500` |
| `MODEL_PROVIDER` | 模型服务商开关，取 `siliconflow` 或 `deepseek` | `siliconflow` |
| `SILICONFLOW_API_KEY` | 硅基流动 API Key | 在服务商控制台获取 |
| `SILICONFLOW_BASE_URL` | 硅基流动接口地址 | `https://api.siliconflow.cn/v1` |
| `SILICONFLOW_MODEL` | 硅基流动模型名 | `deepseek-ai/DeepSeek-V4-Flash` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 在服务商控制台获取 |
| `DEEPSEEK_BASE_URL` | DeepSeek 接口地址 | `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | DeepSeek 模型名 | `deepseek-v4-flash` |
| `JWT_SECRET` | 令牌签名密钥，修改后已签发的令牌全部失效 | 32 字节随机十六进制串 |

## 接口一览

Base URL：`http://localhost:3500`

所有接口统一返回 `{ success, msg, data }`：`success` 表示业务是否成功，`msg` 可直接展示给用户，`data` 为业务数据（无数据时为 `null`）。

| 方法 | 路径 | 需登录 | 说明 | 主要参数 |
| --- | --- | --- | --- | --- |
| GET | `/heartbeat` | 否 | 健康检查 | — |
| POST | `/api/auth/register` | 否 | 注册 | `{ username, password }` |
| POST | `/api/auth/login` | 否 | 登录，返回 `token` 与用户信息 | `{ username, password }` |
| POST | `/api/auth/avatar` | 是 | 上传头像（multipart，字段名 `file`，仅图片，≤ 2MB） | `file` |
| PATCH | `/api/auth/profile` | 是 | 修改昵称 | `{ nickname }` |
| PATCH | `/api/auth/password` | 是 | 修改密码，需校验原密码 | `{ oldPassword, newPassword }` |
| DELETE | `/api/auth/account` | 是 | 注销账号，连同该用户的收藏与历史一并删除 | — |
| GET | `/api/travel/cities` | 否 | 目的地候选项 | — |
| POST | `/api/travel/recommend` | 是 | 生成行程规划，成功后自动写入历史记录 | `{ destination, budget, days }` |
| POST | `/api/travel/chat` | 是 | 流式问答（SSE） | `{ prompt }` |
| GET | `/api/favorites` | 是 | 收藏列表（摘要，不含行程快照） | — |
| GET | `/api/favorites/:id` | 是 | 收藏详情（含行程快照 `plan`） | — |
| POST | `/api/favorites` | 是 | 收藏一份规划，同参数只保留一条 | `{ destination, budget, days, plan }` |
| DELETE | `/api/favorites` | 是 | 清空当前用户的全部收藏 | — |
| DELETE | `/api/favorites/:id` | 是 | 取消收藏 | — |
| GET | `/api/histories` | 是 | 历史记录列表（摘要，不含行程快照） | — |
| GET | `/api/histories/:id` | 是 | 历史详情（含行程快照 `plan`） | — |
| DELETE | `/api/histories` | 是 | 清空当前用户的全部历史记录 | — |
| DELETE | `/api/histories/:id` | 是 | 删除单条历史记录 | — |
| GET | `/uploads/:filename` | 否 | 访问头像等上传资源 | — |

需要登录的接口通过请求头携带令牌：

```
Authorization: Bearer <token>
```

令牌有效期 1 小时，过期后接口返回 401，前端会自动清除登录态并跳转登录页。

### `/api/travel/recommend` 的返回结构

`data` 中除行程本身外，预算明细集中在 `costBreakdown`，六个类目固定为 `accommodation`、`food`、`transport`、`tickets`、`shopping`、`others`，每类包含汇总金额与明细行（`day` 为 `0` 表示跨全程的开支，如往返大交通）：

```json
{
  "dailyPlan": [
    {
      "day": 1,
      "date": "",
      "timeSlots": [
        {
          "period": "morning",
          "activities": [{ "description": "地铁前往故宫", "cost": 5, "category": "transport" }],
          "subtotal": 5
        }
      ],
      "dayTotal": 5
    }
  ],
  "totalCost": 1722,
  "costBreakdown": {
    "accommodation": {
      "amount": 480,
      "items": [
        { "day": 1, "title": "王府井附近精品酒店", "desc": "地铁1号线王府井站步行5分钟", "amount": 480 }
      ]
    },
    "food": { "amount": 45, "items": [] },
    "transport": { "amount": 125, "items": [] },
    "tickets": { "amount": 202, "items": [] },
    "shopping": { "amount": 80, "items": [] },
    "others": { "amount": 30, "items": [] }
  },
  "summary": { "totalActivitiesCost": 437, "remainingBudget": 1278, "currency": "CNY" }
}
```

### `/api/travel/chat` 的 SSE 事件

响应为 `text/event-stream`，每个事件是一行 `data:` 加 JSON：

```
data: {"type":"chunk","content":"北京"}

data: {"type":"complete","data":{"success":true,"reply":"完整回答"}}

data: {"type":"error","msg":"模型服务调用失败"}
```

`chunk` 为增量文本，`complete` 为最终结果，`error` 表示生成失败。前端使用原生 `fetch` 读取流并手动携带令牌（见 `src/services/recommend.js`）。

## 数据存储

| 数据 | 位置 | 说明 |
| --- | --- | --- |
| 用户数据 | `travel-server/src/data/db.json` | lowdb 单文件 JSON，首次启动自动创建为 `{ "users": [] }`，已加入 `.gitignore` |
| 上传文件 | `travel-server/public/uploads/` | 头像以随机文件名保存，已忽略，仅保留 `.gitkeep` 占位 |
| 行程缓存 | 服务进程内存 | 键为「用户 + 目的地 + 预算 + 天数」，有效期 10 分钟，重启服务即失效 |

## 常见问题

- **端口被占用（EADDRINUSE）**：修改 `.env` 中的 `PORT`，或结束占用进程。Windows 可用 `netstat -ano | findstr :3500` 查看占用 PID。
- **接口返回 401**：令牌缺失或已过期，重新登录即可。
- **返回 402 / 502**：模型服务余额不足或调用失败，检查 API Key 与账户余额。
- **生成一次要几十秒**：大模型生成长 JSON 的正常耗时；相同参数在 10 分钟内会直接命中缓存。
- **换了 `JWT_SECRET` 后所有人都要重新登录**：属预期行为，旧令牌的签名不再匹配。

## 注意事项

- `.env` 已被 `.gitignore` 排除，请勿提交真实密钥；提交前请确认 `git status` 中不包含 `.env`、`db.json`、`node_modules`。
- 大模型输出的金额偶尔存在不自洽（例如明细之和与汇总不等），前端已做兜底展示，但该项目主要用于学习与演示，不适合作为生产环境计费依据。
