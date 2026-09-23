import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import 'dotenv/config'

class TravelService {
    constructor() {
        this.llm = null
        this.initLLM()
    }
    // 初始化大模型
    initLLM() {
        let apikey, baseurl, model;
        if (process.env.MODEL_PROVIDER === 'siliconflow') {
            apikey = process.env.SILICONFLOW_API_KEY
            baseurl = process.env.SILICONFLOW_BASE_URL
            model = process.env.SILICONFLOW_MODEL
        } else {
            apikey = process.env.DEEPSEEK_API_KEY
            baseurl = process.env.DEEPSEEK_BASE_URL
            model = process.env.DEEPSEEK_MODEL
        }
        this.llm = new ChatOpenAI({
            apiKey: apikey,
            configuration: {
                baseURL: baseurl,
            },
            model,
            temperature: 0.7,
            maxTokens: 4096,
            timeout: 90000,
            modelKwargs: {
                thinking_budget: 512,
            },
        },)
    }
    // 根据查询参数调用大模型返回推荐信息
    async recommend(destination, budget, days) {
        if (budget <= 100 || days < 1 || days > 30) {
            return new Error('规划参数不满足要求!')
        }
        const prompts = [this.generatePrompt(destination, budget, days)]
        const response = await this.llm.invoke(prompts, {
            response_format: { type: 'json_object' }
        })
        const content = typeof response.content === 'string'
            ? response.content
            : response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('')
        // 打印content
        console.log(content)
        const plan = this.parseModelJson(content)
        if (!Array.isArray(plan.dailyPlan)) {
            throw new Error('模型返回的行程数据格式无效')
        }
        return {
            ...plan,
            city: destination,
            budget: Number(budget),
            days: Number(days)
        }
    }
    // 健壮解析模型返回的 JSON
    parseModelJson(content) {
        let text = String(content || '').trim()
        // 去掉可能的 markdown 代码围栏
        text = text.replace(/```(?:json)?/gi, '').trim()
        // 只截取最外层 JSON 对象
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}')
        if (start === -1 || end === -1) {
            throw new Error('模型返回内容中未找到有效的JSON对象')
        }
        text = text.slice(start, end + 1)
        try {
            return JSON.parse(text)
        } catch (error) {
            // 修复模型中常见的尾随逗号问题后再次尝试
            const repaired = text.replace(/,\s*([}\]])/g, '$1')
            return JSON.parse(repaired)
        }
    }
    // 根据参数生成大模型提示词
    generatePrompt(destination, budget, days) {
        const prompt = `
请根据以下信息，为我制定一份详细的旅游规划：

- 目的地：${destination}
- 旅行时间：${days}天
- 预算：${budget} 元（人民币）

要求：
1. 提供每日的行程安排（上午、下午、晚上）。
2. 推荐必去景点及理由，尽量结合当地特色。
3. 给出交通建议（包括到达目的地后的市内交通）。
4. 推荐住宿区域或酒店类型（需符合预算）。
5. 推荐当地美食或餐厅。
6. 合理分配总预算，并给出大致花费明细（交通、住宿、餐饮、门票、购物、其他）。
7. 行程安排应松弛有度，避免过度紧凑。
8. 只返回一个合法的JSON对象，不要使用Markdown代码块、注释或附加说明。
9. 未提供出发日期时，date返回空字符串，不得自行编造日期。
10. content字段用自然语言把这份行程完整叙述一遍（包含整体感受、逐日安排、交通住宿美食建议），使用 Markdown 的小标题和列表组织，篇幅控制在 400 字左右，便于直接展示给用户。
11. content是JSON字符串，其中的换行必须写成 \\n 转义，不要直接换行，避免破坏JSON结构。
12. costBreakdown是预算明细的唯一数据源，前端只依赖它渲染"预算明细"折叠面板，结构固定为 {"类目": {"amount": 该类目汇总金额, "items": [明细行...]}}，必须包含且只包含 accommodation（住宿）、food（餐饮）、transport（交通）、tickets（门票）、shopping（购物）、others（其他）六个类目，任何一个都不得省略。
13. 明细行的结构为 {"day": 1, "title": "这笔花费是什么", "desc": "补充说明，没有就空字符串", "amount": 60}；day 是这笔花费发生在第几天（从1开始），不属于某一天时填 0；title 是一句话说明，前端会直接展示；amount 是数字，单位元。
14. items 必须逐条列全，不得只给汇总数字：
    - accommodation：每晚一条，title 写酒店或住宿区域名称，desc 写位置交通与推荐理由；
    - food：每餐一条，title 写"早餐/午餐/晚餐 · 吃什么、在哪吃"；
    - transport：往返大交通单独列一条，市内交通按路段分别列出（高铁、机票、地铁、打车等）；
    - tickets：每个收费景点或体验项目一条；
    - shopping：每次购买一条；
    - others：保险、小费、讲解费、行李寄存费、演出预订费等逐项列出，不要列"应急备用金""预留金额"这类虚拟条目。
15. 每个类目的 amount 是"该类目 items 的金额合计"，不是预算上限：amount 必须严格等于 items 中 amount 之和，不要为了用完预算而虚增类目金额。预算没用完的部分体现在 remainingBudget 里即可。
16. 预算明细应与每日行程对得上：day 大于等于 1 的明细行，都应能在对应日期的 timeSlots 中找到对应活动；timeSlots 中的付费活动也应出现在对应类目的 items 中。day 为 0 的行（往返大交通等跨越全程的开支）不要求出现在某一天里。
17. dayTotal只统计当天timeSlots内各活动花费之和，住宿与三餐不计入dayTotal（它们已计入costBreakdown）。
18. 输出前必须自查并使下面两个等式全部成立，不成立就调整金额或补齐明细行，直到成立为止：
    (a) 每个类目的 amount == 该类目 items 的 amount 之和；
    (b) 六个类目 amount 之和 == totalCost。

JSON字段结构参考（注意示例中每个类目的 amount 都等于其 items 的 amount 之和）：
{
  "city": "北京",
  "budget": 3000,
  "days": 2,
  "content": "## 行程概览\\n\\n两天的北京之行以古都人文为主线…\\n\\n## 第一天\\n\\n- 上午：故宫博物院…",
  "dailyPlan": [
    {
      "day": 1,
      "date": "",
      "timeSlots": [
        {
          "period": "morning",
          "activities": [
            {
              "description": "地铁前往故宫",
              "cost": 5
            },
            {
              "description": "故宫博物院门票",
              "cost": 60
            }
          ],
          "subtotal": 65
        },
        {
          "period": "afternoon",
          "activities": [
            {
              "description": "景山公园门票",
              "cost": 2
            }
          ],
          "subtotal": 2
        },
        {
          "period": "evening",
          "activities": [
            {
              "description": "什刹海购买糕点手信",
              "cost": 30
            }
          ],
          "subtotal": 30
        }
      ],
      "dayTotal": 97
    },
    {
      "day": 2,
      "date": "",
      "timeSlots": [
        {
          "period": "morning",
          "activities": [
            {
              "description": "往返八达岭长城的高铁票",
              "cost": 120
            }
          ],
          "subtotal": 120
        },
        {
          "period": "afternoon",
          "activities": [
            {
              "description": "八达岭长城门票（含往返缆车）",
              "cost": 140
            }
          ],
          "subtotal": 140
        },
        {
          "period": "evening",
          "activities": [
            {
              "description": "王府井购买特产",
              "cost": 50
            },
            {
              "description": "两日旅游意外险",
              "cost": 30
            }
          ],
          "subtotal": 80
        }
      ],
      "dayTotal": 340
    }
  ],
  "totalCost": 1722,
  "costBreakdown": {
    "accommodation": {
      "amount": 960,
      "items": [
        {
          "day": 1,
          "title": "王府井附近精品酒店",
          "desc": "东城区王府井大街，地铁1号线王府井站步行5分钟；位置居中，逛故宫和天安门都方便",
          "amount": 480
        },
        {
          "day": 2,
          "title": "王府井附近精品酒店",
          "desc": "连住不用换酒店，省去搬行李的时间",
          "amount": 480
        }
      ]
    },
    "food": {
      "amount": 325,
      "items": [
        {
          "day": 1,
          "title": "早餐 · 酒店自助早餐（已含在房价内）",
          "desc": "",
          "amount": 0
        },
        {
          "day": 1,
          "title": "午餐 · 前门大街老北京炸酱面",
          "desc": "",
          "amount": 45
        },
        {
          "day": 1,
          "title": "晚餐 · 四季民福烤鸭（故宫店）",
          "desc": "",
          "amount": 120
        },
        {
          "day": 2,
          "title": "早餐 · 酒店周边早餐铺包子豆浆",
          "desc": "",
          "amount": 20
        },
        {
          "day": 2,
          "title": "午餐 · 八达岭景区简餐",
          "desc": "",
          "amount": 60
        },
        {
          "day": 2,
          "title": "晚餐 · 牛街清真涮羊肉",
          "desc": "",
          "amount": 80
        }
      ]
    },
    "transport": {
      "amount": 125,
      "items": [
        {
          "day": 1,
          "title": "地铁前往故宫",
          "desc": "",
          "amount": 5
        },
        {
          "day": 2,
          "title": "往返八达岭长城的高铁票",
          "desc": "北京北站出发，二等座",
          "amount": 120
        }
      ]
    },
    "tickets": {
      "amount": 202,
      "items": [
        {
          "day": 1,
          "title": "故宫博物院门票",
          "desc": "",
          "amount": 60
        },
        {
          "day": 1,
          "title": "景山公园门票",
          "desc": "",
          "amount": 2
        },
        {
          "day": 2,
          "title": "八达岭长城门票（含往返缆车）",
          "desc": "",
          "amount": 140
        }
      ]
    },
    "shopping": {
      "amount": 80,
      "items": [
        {
          "day": 1,
          "title": "什刹海购买糕点手信",
          "desc": "",
          "amount": 30
        },
        {
          "day": 2,
          "title": "王府井购买特产",
          "desc": "",
          "amount": 50
        }
      ]
    },
    "others": {
      "amount": 30,
      "items": [
        {
          "day": 2,
          "title": "两日旅游意外险",
          "desc": "",
          "amount": 30
        }
      ]
    }
  },
  "summary": {
    "totalActivitiesCost": 437,
    "remainingBudget": 1278,
    "currency": "CNY"
  }
}
`
        return new HumanMessage(prompt)
    }
    async chat(message, streamCallback) {
        const messages = [
            new SystemMessage('你是一个专业的旅游规划助手,请根据用户的问题,生成一个详细的旅游规划，或者回答用户的问题。'),
            new HumanMessage(message)
        ]
        try {
            const response = await this.llm.stream(messages)
            let fullResponse = ''
            for await (const chunk of response) {
                const content = chunk.content || ''
                if (!content) {
                    continue
                }
                fullResponse += content
                streamCallback(content)
            }
            return {
                success: true,
                reply: fullResponse,
            }
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            }
        }
    }
}
export default TravelService
