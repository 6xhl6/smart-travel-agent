<script setup>
import { onActivated, onBeforeUnmount, onMounted, ref, computed } from 'vue'
import router from '@/router/index.js'
import { useUserStore, useSettingsStore } from '@/store/index'
import { getCities } from '@/services/recommend'

const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 目的地候选项由后端下发，避免前端再维护一份城市清单
const loadCities = async () => {
    try {
        const { data } = await getCities()
        cityColumns.value = data || []
    } catch (error) {
        showToast(error.message || '目的地列表加载失败')
    }
}

onMounted(() => {
    loadCities()
})
// 预算与天数取设置页里的行程偏好作为默认值
const form = ref({
    destination: '',
    budget: settingsStore.defaultBudget || '',
    days: settingsStore.defaultDays || 1
})

// 首页被 keep-alive 缓存，从设置页改完偏好回来时同步一次；
// 已填过目的地的表单不动，避免覆盖用户正在编辑的内容
onActivated(() => {
    if (form.value.destination) return
    form.value.budget = settingsStore.defaultBudget || ''
    form.value.days = settingsStore.defaultDays || 1
})

const showCityPicker = ref(false)
const cityColumns = ref([])
const onConfirmCity = (value) => {
    showCityPicker.value = false
    form.value.destination = value.selectedValues[0]
}
// 需要登录的入口统一在这里拦截：对话与推荐接口都有 requireAuth，
// 未登录直接进去会发请求被 401 弹回登录页，还会丢掉已填的参数
const ensureLogin = (tip) => {
    if (userStore.token) {
        return true
    }
    showConfirmDialog({
        title: '需要登录',
        message: `${tip}需要登录后使用，是否前往登录？`,
        confirmButtonText: '去登录'
    })
        .then(() => router.push({ name: 'LoginIndex' }))
        .catch(() => { })
    return false
}

const isLoading = ref(false)
const submitForm = async () => {
    if (!ensureLogin('行程规划')) {
        return
    }
    isLoading.value = true
    if (!form.value.destination) {
        return showToast('请输入目的地')
    }
    if (!form.value.budget || form.value.budget <= 100) {
        return showToast('预算不能低于100元')
    }
    if (!form.value.days || form.value.days <= 0 || form.value.days > 30) {
        return showToast('天数必须在1-30天之间')
    }
    isLoading.value = false
    router.push({
        path: '/detail',
        query: {
            destination: form.value.destination,
            budget: form.value.budget,
            days: form.value.days
        }
    })
}

const goChat = () => {
    if (!ensureLogin('查询旅游信息')) {
        return
    }
    router.push({ name: 'DialogIndex' })
}

// 表单本身就在视口内（页面不滚动），用一次高亮代替滚动作为引导
const isFormActive = ref(false)
let highlightTimer = null
const highlightForm = () => {
    isFormActive.value = true
    clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
        isFormActive.value = false
    }, 1200)
}
onBeforeUnmount(() => clearTimeout(highlightTimer))

const isFormFilled = computed(() => {
    return Object.values(form.value).every(item => String(item).trim() !== '')
})
// 规划路线：高亮表单并直接打开目的地选择器
const focusPlanForm = () => {
    if (isFormFilled.value) {
        submitForm()
        return
    }
    highlightForm()
    showCityPicker.value = true
}

// 热门目的地：点击卡片只回填目的地，预算与天数仍需用户确认
const fillDestination = (item) => {
    form.value.destination = item.name
    highlightForm()
}

// 「去规划」：使用卡片预设的预算与天数直接生成行程
const planDestination = (item) => {
    if (!ensureLogin('行程规划')) {
        return
    }
    router.push({
        path: '/detail',
        query: {
            destination: item.name,
            budget: item.budget,
            days: item.days
        }
    })
}

// 热门目的地配置：配色、预设预算与天数都跟着数据走
const popularDestinations = [
    { name: '北京', desc: '古都人文', budget: 3000, days: 3, color: '#ee5c5c', bg: '#fff5f5' },
    { name: '上海', desc: '都市漫游', budget: 2800, days: 3, color: '#1989fa', bg: '#f0f7ff' },
    { name: '成都', desc: '休闲美食', budget: 2000, days: 4, color: '#ed9b24', bg: '#fff8e8' },
    { name: '杭州', desc: '湖光山色', budget: 2200, days: 2, color: '#07a85a', bg: '#eef9f2' }
]

// 快捷入口配置：增删入口只改这个数组，配色与点击行为都跟着数据走
const quickEntries = [
    {
        key: 'qa',
        icon: 'chat-o',
        text: '查询旅游信息',
        color: '#1989fa',
        onSelect: goChat
    },
    {
        key: 'plan',
        icon: 'guide-o',
        text: '规划旅游路线',
        color: '#07c160',
        onSelect: focusPlanForm
    }
]
</script>

<template>
    <div class="home-page">
        <van-nav-bar title="智能旅游助手" />
        <main class="page-container">
            <van-notice-bar left-icon="volume-o" text="智能旅游助手是一个基于AI的旅游助手，您可以使用它来查询旅游信息、规划旅游路线、推荐旅游景点等。" />
            <div class="form-container" :class="{ 'is-active': isFormActive }">
                <van-cell-group title="用户信息" class="form-group">
                    <template #title>
                        <span class="form-title">用户信息</span>
                    </template>
                    <van-field class="form-cell" v-model="form.destination" label="目的地" readonly placeholder="请输入目的地"
                        is-link @click="showCityPicker = true" />
                    <van-field class="form-cell" v-model="form.budget" label="预算" placeholder="请输入预算" />
                    <van-field class="form-cell" v-model="form.days" type="number" label="天数" placeholder="请输入天数" />
                    <van-button class="submit-btn" type="primary" block @click="submitForm">提交</van-button>
                    <van-popup v-model:show="showCityPicker" position="bottom" class="region-popup">
                        <van-picker :columns="cityColumns" @confirm="onConfirmCity" @cancel="showCityPicker = false"
                            title="请选择目的地" />
                    </van-popup>
                </van-cell-group>
            </div>
            <div class="quick-entrance">
                <div class="section-title">快捷入口</div>
                <div class="quick-content">
                    <div v-for="item in quickEntries" :key="item.key" class="quick-item"
                        :style="{ '--item-color': item.color }" @click="item.onSelect">
                        <van-icon :name="item.icon" />
                        <div class="quick-text">{{ item.text }}</div>
                    </div>
                </div>
            </div>
            <div class="popular-destinations">
                <div class="section-title">热门目的地</div>
                <div class="destination-content">
                    <div v-for="item in popularDestinations" :key="item.name" class="destination-item"
                        :style="{ '--item-color': item.color, '--item-bg': item.bg }" @click="fillDestination(item)">
                        <van-icon name="location-o" />
                        <span class="destination-name">{{ item.name }}</span>
                        <span class="destination-desc">{{ item.desc }}</span>
                        <span class="destination-plan" @click.stop="planDestination(item)">去规划</span>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.home-page {
    height: calc(100dvh - 50px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #f3f4f6;
}

.home-page :deep(.van-nav-bar) {
    flex: 0 0 46px;
}

.page-container {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: 40px minmax(0, 1.55fr) minmax(0, 0.65fr) minmax(0, 0.85fr);
    gap: 8px;
    box-sizing: border-box;
    padding: 8px 10px 10px;
    overflow: hidden;
}

.page-container :deep(.van-notice-bar) {
    height: 100%;
    padding: 0 12px;
    border-radius: 6px;
}

.form-container {
    min-height: 0;
    display: flex;
    flex-direction: column;
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
    transition: box-shadow 0.2s;
}

/* 点击「规划旅游路线」时短暂高亮表单，提示用户从这里开始填 */
.form-container.is-active {
    box-shadow: 0 0 0 2px rgba(7, 193, 96, 0.5);
}

.form-container :deep(.van-cell-group__title) {
    flex: 0 0 auto;
    padding: 8px 12px 4px;
    line-height: 20px;
}

.form-group {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 0 10px 10px;
}

.form-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
}

.form-cell {
    flex: 1;
    min-height: 0;
    width: 100%;
    margin: 4px 0;
    padding: 6px 10px;
    border-radius: 6px;
    background-color: #f7f8fa;
}

.submit-btn {
    margin-top: 4px;
}

.region-popup {
    border-radius: 8px 8px 0 0;
}

.quick-entrance,
.popular-destinations {
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 8px;
    background-color: #fff;
    overflow: hidden;
}

.section-title {
    flex: 0 0 auto;
    padding-left: 2px;
    font-size: 16px;
    line-height: 22px;
    font-weight: bold;
    color: #333;
}

.quick-content {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 6px;
}

.quick-item {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 4px 8px;
    text-align: center;
    border-radius: 6px;
    background-color: #f5f7fa;
    cursor: pointer;
    transition: background-color 0.15s, transform 0.15s;
}

.quick-item:active {
    background-color: #e8ecf2;
    transform: scale(0.97);
}

.quick-item :deep(.van-icon) {
    flex: 0 0 auto;
    font-size: 21px;
    color: var(--item-color);
}

.quick-text {
    overflow: hidden;
    font-size: 13px;
    line-height: 18px;
    color: #333;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.destination-content {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
    padding-top: 6px;
}

.destination-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 2px;
    border-radius: 6px;
    background-color: var(--item-bg);
    cursor: pointer;
    transition: transform 0.15s;
}

.destination-item:active {
    transform: scale(0.97);
}

.destination-item :deep(.van-icon) {
    margin-bottom: 2px;
    font-size: 18px;
    color: var(--item-color);
}

.destination-plan {
    flex: 0 0 auto;
    margin-top: 5px;
    padding: 0 6px;
    font-size: 10px;
    line-height: 16px;
    color: #fff;
    border-radius: 8px;
    background-color: var(--item-color);
    opacity: 0.9;
}

.destination-plan:active {
    opacity: 1;
}

.destination-name {
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: #2f3337;
}

.destination-desc {
    overflow: hidden;
    max-width: 100%;
    font-size: 11px;
    line-height: 16px;
    color: #8b9198;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-height: 600px) {
    .page-container {
        gap: 6px;
        padding: 6px 8px 8px;
    }

    .form-container :deep(.van-cell-group__title) {
        padding-top: 5px;
    }

    .quick-entrance,
    .popular-destinations {
        padding: 6px 8px;
    }
}
</style>
