<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTravelPlan } from '@/services/recommend.js'
import { addFavorite, getFavoriteDetail, getFavorites, removeFavorite } from '@/services/favorite'
import { getHistoryDetail } from '@/services/history'
import { useUserStore } from '@/store/index'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const form = {
    destination: route.query.destination || '',
    budget: Number(route.query.budget) || 0,
    days: Number(route.query.days) || 0
}

const result = ref(null)
const isLoading = ref(true)
const isFailGotPlan = ref(false)
const errorMessage = ref('')

const periodConfig = {
    morning: { label: '上午', type: 'warning' },
    afternoon: { label: '下午', type: 'primary' },
    evening: { label: '晚上', type: 'success' }
}

const costConfig = [
    { key: 'accommodation', label: '住宿', icon: 'home-o' },
    { key: 'food', label: '餐饮', icon: 'shop-o' },
    { key: 'transport', label: '交通', icon: 'logistics' },
    { key: 'tickets', label: '门票', icon: 'coupon-o' },
    { key: 'shopping', label: '购物', icon: 'cart-o' },
    { key: 'others', label: '其他', icon: 'more-o' }
]

const pageTitle = computed(() => `${result.value?.city || form.destination || '目的地'}行程规划`)
const totalCost = computed(() => Number(result.value?.totalCost) || 0)
const remainingBudget = computed(() => {
    const remaining = Number(result.value?.summary?.remainingBudget)
    return Number.isFinite(remaining) ? remaining : form.budget - totalCost.value
})
const budgetUsage = computed(() => {
    if (!form.budget) return 0
    return Math.min(100, Math.round((totalCost.value / form.budget) * 100))
})
const isOverBudget = computed(() => totalCost.value > form.budget)
const activeBudgetPanels = ref(['accommodation'])

// 预算明细：渲染信息全部来自 costBreakdown，每个类目形如 { amount, items: [{ day, title, desc, amount }] }
const costItems = computed(() =>
    costConfig.map((item) => {
        const breakdown = result.value?.costBreakdown?.[item.key] || {}
        const details = (Array.isArray(breakdown.items) ? breakdown.items : []).map((row, index) => ({
            key: `${item.key}-${index}`,
            day: Number(row?.day) || 0,
            title: row?.title || '未命名支出',
            desc: row?.desc || '',
            amount: Number(row?.amount) || 0
        }))
        const itemSum = details.reduce((sum, detail) => sum + detail.amount, 0)
        // 模型偶尔会算错汇总：多算时就补一条差额行，少算时直接以明细之和为准，
        // 保证类目金额永远等于展开后各行之和
        const amount = Math.max(Number(breakdown.amount) || 0, itemSum)
        if (amount > itemSum) {
            details.push({
                key: `${item.key}-residual`,
                day: 0,
                title: '未明细支出',
                desc: '',
                amount: amount - itemSum
            })
        }
        return { ...item, amount, details }
    })
)

const formatMoney = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount.toLocaleString('zh-CN') : '0'
}

const getPeriod = (period) => periodConfig[period] || {
    label: period || '行程',
    type: 'default'
}

const onClickLeft = () => {
    router.back()
}

// 收藏状态：命中收藏记录时保存其 id，供取消收藏使用
const favoriteId = ref('')
const isFavorite = computed(() => !!favoriteId.value)
const isFavoriteLoading = ref(false)

// 按规划参数调用模型生成行程
const fetchPlanFromModel = async () => {
    const res = await getTravelPlan(form)
    if (!res?.data || !Array.isArray(res.data.dailyPlan)) {
        throw new Error('返回的行程数据格式不正确')
    }
    result.value = res.data
}

// 从收藏/历史进入：直接回显当时保存的行程快照，不再调用模型重新生成
const loadSnapshotPlan = async (source, id) => {
    const fromFavorite = source === 'favorite'
    const res = fromFavorite ? await getFavoriteDetail(id) : await getHistoryDetail(id)
    const record = res?.data
    if (!record) {
        throw new Error('记录不存在')
    }
    // 用快照回填规划参数，后续收藏/取消收藏仍可复用
    form.destination = record.destination
    form.budget = Number(record.budget)
    form.days = Number(record.days)
    // 从收藏进入时已知收藏 id，星标直接显示为已收藏
    if (fromFavorite) {
        favoriteId.value = record.id
    }
    if (record.plan && Array.isArray(record.plan.dailyPlan)) {
        result.value = record.plan
        return
    }
    // 兼容早期只存了规划参数、没有行程快照的记录
    await fetchPlanFromModel()
}

const getPlan = async () => {
    isLoading.value = true
    isFailGotPlan.value = false
    errorMessage.value = ''

    try {
        if (route.query.favoriteId) {
            await loadSnapshotPlan('favorite', route.query.favoriteId)
        } else if (route.query.historyId) {
            await loadSnapshotPlan('history', route.query.historyId)
        } else {
            await fetchPlanFromModel()
        }
    } catch (error) {
        result.value = null
        isFailGotPlan.value = true
        errorMessage.value = error.response?.data?.msg || error.message || '请稍后重新尝试'
    } finally {
        isLoading.value = false
    }
}

// 判断收藏记录与当前规划参数是否指向同一份规划
const isSamePlan = (item) =>
    item.destination === form.destination
    && Number(item.budget) === form.budget
    && Number(item.days) === form.days

// 未登录时不查询，避免触发无意义的 401
const loadFavoriteState = async () => {
    if (!userStore.token) return
    try {
        const res = await getFavorites()
        const matched = (res?.data || []).find(isSamePlan)
        favoriteId.value = matched?.id || ''
    } catch (error) {
        // 收藏状态只影响按钮展示，静默失败即可，不打断行程浏览
        favoriteId.value = ''
    }
}

const onToggleFavorite = async () => {
    if (!userStore.token) {
        showConfirmDialog({
            title: '需要登录',
            message: '收藏行程需要登录后使用，是否前往登录？',
            confirmButtonText: '去登录'
        })
            .then(() => router.push({ name: 'LoginIndex' }))
            .catch(() => { })
        return
    }
    if (isFavoriteLoading.value) return

    isFavoriteLoading.value = true
    try {
        if (isFavorite.value) {
            await removeFavorite(favoriteId.value)
            favoriteId.value = ''
            showToast('已取消收藏')
        } else {
            const res = await addFavorite({
                destination: form.destination,
                budget: form.budget,
                days: form.days,
                // 连同当前展示的行程一起保存，之后从收藏进入可直接回显
                plan: result.value
            })
            favoriteId.value = res?.data?.id || ''
            showToast('收藏成功')
        }
    } catch (error) {
        showToast(error.message || '操作失败，请稍后重试')
    } finally {
        isFavoriteLoading.value = false
    }
}

onMounted(async () => {
    await getPlan()
    // 从收藏进入时接口已返回收藏 id，无需再查；历史进入或新生成时需要查一次收藏状态
    if (!favoriteId.value) {
        await loadFavoriteState()
    }
})
</script>

<template>
    <div class="detail-page">
        <van-nav-bar
            class="nav-bar"
            :title="pageTitle"
            left-text="返回"
            left-arrow
            @click-left="onClickLeft"
        >
            <template v-if="result" #right>
                <van-icon
                    :name="isFavorite ? 'star' : 'star-o'"
                    :color="isFavorite ? '#ffb300' : undefined"
                    size="20"
                    @click="onToggleFavorite"
                />
            </template>
        </van-nav-bar>

        <main v-if="isLoading" class="loading-container">
            <van-loading size="28" type="spinner" vertical color="#1989fa">
                正在生成旅游规划
            </van-loading>
            <p>AI 正在整理行程和预算，请稍候</p>
        </main>

        <main v-else-if="isFailGotPlan" class="error-container" role="alert">
            <van-icon class="error-icon" name="warning-o" />
            <h1 class="error-title">获取行程失败</h1>
            <p class="error-desc">{{ errorMessage }}</p>
            <div class="error-actions">
                <van-button plain type="primary" @click="onClickLeft">返回上一页</van-button>
                <van-button type="primary" icon="replay" @click="getPlan">重新获取</van-button>
            </div>
        </main>

        <main v-else-if="result" class="page-content">
            <section class="trip-overview">
                <div class="overview-heading">
                    <div class="overview-kicker">
                        <van-icon name="location-o" />
                        智能行程
                    </div>
                    <h1>{{ result.city }}</h1>
                    <p>{{ result.days }}天行程 · {{ result.summary?.currency || 'CNY' }}</p>
                </div>
                <van-tag
                    class="budget-status"
                    :type="isOverBudget ? 'danger' : 'success'"
                    plain
                >
                    {{ isOverBudget ? '超出预算' : '预算内' }}
                </van-tag>

                <div class="summary-grid">
                    <div class="summary-item">
                        <span>总预算</span>
                        <strong>¥{{ formatMoney(result.budget) }}</strong>
                    </div>
                    <div class="summary-item">
                        <span>预计花费</span>
                        <strong>¥{{ formatMoney(totalCost) }}</strong>
                    </div>
                    <div class="summary-item">
                        <span>{{ remainingBudget >= 0 ? '剩余预算' : '超出金额' }}</span>
                        <strong :class="{ 'danger-text': remainingBudget < 0 }">
                            ¥{{ formatMoney(Math.abs(remainingBudget)) }}
                        </strong>
                    </div>
                </div>

                <div class="budget-progress">
                    <div class="progress-label">
                        <span>预算使用</span>
                        <span>{{ budgetUsage }}%</span>
                    </div>
                    <van-progress
                        :percentage="budgetUsage"
                        :show-pivot="false"
                        :stroke-width="6"
                        :color="isOverBudget ? '#ee5c5c' : '#1989fa'"
                    />
                </div>
            </section>

            <section class="content-section">
                <div class="section-heading">
                    <div>
                        <van-icon name="balance-list-o" />
                        <h2>预算明细</h2>
                    </div>
                    <span>预计总计 ¥{{ formatMoney(totalCost) }}</span>
                </div>
                <van-collapse v-model="activeBudgetPanels" class="budget-collapse" :border="false">
                    <van-collapse-item
                        v-for="item in costItems"
                        :key="item.key"
                        :name="item.key"
                        :readonly="!item.details.length"
                    >
                        <template #icon>
                            <span class="cost-icon">
                                <van-icon :name="item.icon" />
                            </span>
                        </template>
                        <template #title>
                            <span class="cost-label">{{ item.label }}</span>
                        </template>
                        <template #value>
                            <strong class="cost-amount">¥{{ formatMoney(item.amount) }}</strong>
                        </template>

                        <div class="detail-list">
                            <div
                                v-for="detail in item.details"
                                :key="detail.key"
                                class="detail-row"
                            >
                                <span class="detail-day">{{ detail.day ? `D${detail.day}` : '—' }}</span>
                                <div class="detail-body">
                                    <p class="detail-title">{{ detail.title }}</p>
                                    <p v-if="detail.desc" class="detail-desc">{{ detail.desc }}</p>
                                </div>
                                <span
                                    class="detail-amount"
                                    :class="{ free: detail.amount === 0 }"
                                >
                                    {{ detail.amount === 0 ? '免费' : `¥${formatMoney(detail.amount)}` }}
                                </span>
                            </div>
                        </div>
                    </van-collapse-item>
                </van-collapse>
            </section>

            <section class="content-section itinerary-section">
                <div class="section-heading">
                    <div>
                        <van-icon name="todo-list-o" />
                        <h2>每日行程</h2>
                    </div>
                    <van-tag plain type="primary">{{ result.dailyPlan.length }}天</van-tag>
                </div>

                <article
                    v-for="day in result.dailyPlan"
                    :key="day.day"
                    class="day-card"
                >
                    <header class="day-card-header">
                        <span class="day-badge">D{{ day.day }}</span>
                        <div class="day-title">
                            <h3>第 {{ day.day }} 天</h3>
                            <span v-if="day.date">{{ day.date }}</span>
                            <span v-else>行程安排</span>
                        </div>
                        <div class="day-cost">
                            <span>当日预计</span>
                            <strong>¥{{ formatMoney(day.dayTotal) }}</strong>
                        </div>
                    </header>

                    <div class="day-content">
                        <div
                            v-for="(slot, slotIndex) in day.timeSlots"
                            :key="`${day.day}-${slot.period}-${slotIndex}`"
                            class="time-slot"
                        >
                            <div class="slot-heading">
                                <van-tag :type="getPeriod(slot.period).type">
                                    {{ getPeriod(slot.period).label }}
                                </van-tag>
                                <span>小计 ¥{{ formatMoney(slot.subtotal) }}</span>
                            </div>

                            <div class="activity-list">
                                <div
                                    v-for="(activity, activityIndex) in slot.activities"
                                    :key="activityIndex"
                                    class="activity-item"
                                >
                                    <span class="activity-marker"></span>
                                    <p>{{ activity.description }}</p>
                                    <span
                                        class="activity-cost"
                                        :class="{ free: Number(activity.cost) === 0 }"
                                    >
                                        {{ Number(activity.cost) === 0 ? '免费' : `¥${formatMoney(activity.cost)}` }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </section>
        </main>
    </div>
</template>

<style scoped>
.detail-page {
    min-height: 100dvh;
    color: #2f3337;
    background-color: #f4f6f8;
}

.nav-bar {
    position: sticky;
    top: 0;
    z-index: 10;
}

.loading-container,
.error-container {
    min-height: calc(100dvh - 46px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 32px 24px;
    text-align: center;
}

.loading-container p {
    margin: 14px 0 0;
    font-size: 13px;
    line-height: 20px;
    color: #8b9198;
}

.error-icon {
    margin-bottom: 14px;
    font-size: 48px;
    color: #ee5c5c;
}

.error-title {
    margin: 0;
    font-size: 18px;
    line-height: 26px;
    font-weight: 600;
}

.error-desc {
    max-width: 320px;
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 22px;
    color: #8b9198;
}

.error-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

.error-actions :deep(.van-button) {
    min-width: 112px;
}

.page-content {
    width: min(100%, 760px);
    margin: 0 auto;
    box-sizing: border-box;
    padding: 12px 12px 32px;
}

.trip-overview {
    position: relative;
    padding: 18px 16px 16px;
    color: #fff;
    background-color: #245c8f;
    border-radius: 8px;
}

.overview-kicker {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    line-height: 18px;
    color: #dcebf8;
}

.overview-heading h1 {
    margin: 4px 0 0;
    font-size: 26px;
    line-height: 34px;
}

.overview-heading p {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 20px;
    color: #dcebf8;
}

.budget-status {
    position: absolute;
    top: 18px;
    right: 16px;
    background-color: #fff;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 18px;
    border-top: 1px solid rgb(255 255 255 / 20%);
    border-bottom: 1px solid rgb(255 255 255 / 20%);
}

.summary-item {
    min-width: 0;
    padding: 12px 6px;
    text-align: center;
}

.summary-item + .summary-item {
    border-left: 1px solid rgb(255 255 255 / 20%);
}

.summary-item span,
.summary-item strong {
    display: block;
}

.summary-item span {
    font-size: 11px;
    line-height: 18px;
    color: #dcebf8;
}

.summary-item strong {
    overflow-wrap: anywhere;
    font-size: 16px;
    line-height: 24px;
}

.danger-text {
    color: #ffd3d3;
}

.budget-progress {
    margin-top: 14px;
}

.progress-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #dcebf8;
}

.budget-progress :deep(.van-progress) {
    background-color: rgb(255 255 255 / 24%);
}

.content-section {
    margin-top: 20px;
}

.section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    padding: 0 2px;
}

.section-heading > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
}

.section-heading :deep(.van-icon) {
    flex: 0 0 auto;
    font-size: 19px;
    color: #1989fa;
}

.section-heading h2 {
    margin: 0;
    font-size: 17px;
    line-height: 24px;
}

.section-heading > span {
    flex: 0 0 auto;
    font-size: 12px;
    line-height: 18px;
    color: #8b9198;
}

/* 预算明细：管风琴。有每日明细的类目可展开，没有的（交通/门票/购物/其他）只显示汇总金额 */
.budget-collapse {
    overflow: hidden;
    background-color: #fff;
    border: 1px solid #e8ebef;
    border-radius: 8px;
}

.budget-collapse :deep(.van-cell) {
    align-items: center;
    padding: 11px 14px;
}

.cost-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 10px;
    color: #245c8f;
    background-color: #edf5fb;
    border-radius: 6px;
}

.cost-label {
    font-size: 14px;
    color: #2f3337;
}

.cost-amount {
    color: #2f3337;
}

.budget-collapse :deep(.van-collapse-item__content) {
    padding: 2px 14px 10px;
    font-size: 13px;
    color: inherit;
    background-color: #fff;
}

.detail-row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    align-items: start;
    gap: 8px;
    padding: 8px 0;
}

.detail-row + .detail-row {
    border-top: 1px solid #f0f1f3;
}

.detail-day {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 18px;
    margin-top: 1px;
    font-size: 11px;
    font-weight: 600;
    color: #245c8f;
    background-color: #edf5fb;
    border-radius: 4px;
}

.detail-body {
    min-width: 0;
}

.detail-title {
    margin: 0;
    font-size: 13px;
    line-height: 19px;
    color: #3f444a;
    overflow-wrap: anywhere;
}

.detail-desc {
    margin: 3px 0 0;
    font-size: 11px;
    line-height: 17px;
    color: #8b9198;
    overflow-wrap: anywhere;
}

.detail-amount {
    min-width: 40px;
    padding-top: 1px;
    text-align: right;
    font-size: 12px;
    line-height: 19px;
    font-weight: 600;
    color: #ee5c5c;
}

.detail-amount.free {
    color: #07a85a;
}

.day-card {
    overflow: hidden;
    margin-bottom: 12px;
    background-color: #fff;
    border: 1px solid #e8ebef;
    border-radius: 8px;
}

.day-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 14px;
    background-color: #f8fafc;
    border-bottom: 1px solid #edf0f3;
}

.day-badge {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    background-color: #245c8f;
    border-radius: 6px;
}

.day-title {
    min-width: 0;
    flex: 1;
}

.day-title h3,
.day-title span,
.day-cost span,
.day-cost strong {
    display: block;
}

.day-title h3 {
    margin: 0;
    font-size: 16px;
    line-height: 22px;
}

.day-title span,
.day-cost span {
    font-size: 11px;
    line-height: 17px;
    color: #8b9198;
}

.day-cost {
    flex: 0 0 auto;
    text-align: right;
}

.day-cost strong {
    font-size: 15px;
    line-height: 22px;
    color: #ee5c5c;
}

.day-content {
    padding: 0 14px;
}

.time-slot {
    padding: 14px 0;
}

.time-slot + .time-slot {
    border-top: 1px solid #f0f1f3;
}

.slot-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
}

.slot-heading > span {
    font-size: 11px;
    line-height: 18px;
    color: #969ba1;
}

.activity-list {
    padding-left: 5px;
}

.activity-item {
    position: relative;
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: start;
    gap: 8px;
    padding: 7px 0;
}

.activity-item:not(:last-child)::after {
    position: absolute;
    top: 19px;
    bottom: -9px;
    left: 4px;
    width: 1px;
    background-color: #dce5ed;
    content: '';
}

.activity-marker {
    position: relative;
    z-index: 1;
    width: 8px;
    height: 8px;
    margin-top: 6px;
    background-color: #1989fa;
    border: 2px solid #e5f2ff;
    border-radius: 50%;
}

.activity-item p {
    min-width: 0;
    margin: 0;
    font-size: 14px;
    line-height: 21px;
    color: #3f444a;
    overflow-wrap: anywhere;
}

.activity-cost {
    min-width: 42px;
    margin-top: 1px;
    padding-left: 4px;
    text-align: right;
    font-size: 12px;
    line-height: 20px;
    font-weight: 600;
    color: #ee5c5c;
}

.activity-cost.free {
    color: #07a85a;
}

@media (min-width: 768px) {
    .page-content {
        padding-top: 20px;
    }

    .summary-item strong {
        font-size: 18px;
    }
}

@media (max-width: 360px) {
    .page-content {
        padding-right: 8px;
        padding-left: 8px;
    }

    .trip-overview {
        padding-right: 12px;
        padding-left: 12px;
    }

    .overview-heading h1 {
        max-width: 190px;
        font-size: 23px;
    }

    .summary-item {
        padding-right: 3px;
        padding-left: 3px;
    }

    .summary-item strong {
        font-size: 14px;
    }

    .activity-item {
        grid-template-columns: 10px minmax(0, 1fr);
    }

    .activity-cost {
        grid-column: 2;
        text-align: left;
    }
}
</style>
