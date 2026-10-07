<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFavorites, removeFavorite } from '@/services/favorite'

const router = useRouter()

const list = ref([])
const isLoading = ref(true)

const getList = async () => {
    isLoading.value = true
    try {
        const { data } = await getFavorites()
        list.value = Array.isArray(data) ? data : []
    } catch (error) {
        showToast(error.message || '获取收藏列表失败，请稍后重试')
    } finally {
        isLoading.value = false
    }
}

onMounted(getList)

const onClickLeft = () => {
    router.back()
}

// 点击记录：只带收藏 id 进详情页，由详情页按 id 取回当时保存的行程快照直接回显，
// 不会重新调用模型生成，保证内容和收藏时完全一致
const onItemClick = (item) => {
    router.push({
        path: '/detail',
        query: { favoriteId: item.id }
    })
}

const onDelete = async (item) => {
    try {
        await removeFavorite(item.id)
        list.value = list.value.filter((row) => row.id !== item.id)
        showToast('已取消收藏')
    } catch (error) {
        showToast(error.message || '取消收藏失败，请稍后重试')
    }
}

const goHome = () => {
    router.push({ name: 'HomeIndex' })
}

const formatMoney = (value) => {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount.toLocaleString('zh-CN') : '0'
}

const formatTime = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (num) => String(num).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
</script>

<template>
    <div class="favorite-page">
        <van-nav-bar class="nav-bar" title="我的收藏" left-text="返回" left-arrow @click-left="onClickLeft" />

        <main v-if="isLoading" class="state-container">
            <van-loading size="24" vertical color="#1989fa">正在加载收藏</van-loading>
        </main>

        <main v-else-if="!list.length" class="state-container">
            <van-empty image="search" description="还没有收藏的行程">
                <van-button class="empty-button" type="primary" size="small" round @click="goHome">
                    去规划一份
                </van-button>
            </van-empty>
        </main>

        <main v-else class="list-container">
            <van-swipe-cell v-for="item in list" :key="item.id">
                <van-cell class="favorite-cell" is-link @click="onItemClick(item)">
                    <template #icon>
                        <span class="cell-icon"><van-icon name="location-o" /></span>
                    </template>
                    <template #title>
                        <span class="cell-title">{{ item.destination }}</span>
                    </template>
                    <template #label>
                        <span class="cell-meta">
                            预算 ¥{{ formatMoney(item.budget) }} · {{ item.days }}天
                        </span>
                        <span class="cell-time">收藏于 {{ formatTime(item.createdAt) }}</span>
                    </template>
                </van-cell>
                <template #right>
                    <van-button class="delete-button" square type="danger" text="删除" @click="onDelete(item)" />
                </template>
            </van-swipe-cell>
            <p class="list-tip">左滑可删除收藏，点击可回到行程详情</p>
        </main>
    </div>
</template>

<style scoped>
.favorite-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background-color: #f3f5f7;
}

.nav-bar {
    border-bottom: 1px solid #eceff2;
}

.state-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
}

.empty-button {
    width: 120px;
}

.list-container {
    flex: 1;
    padding: 12px;
}

.favorite-cell {
    align-items: center;
    border-radius: 12px;
}

.favorite-cell:active {
    background-color: #f7f8fa;
}

.cell-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    margin-right: 10px;
    border-radius: 50%;
    background-color: #eef5ff;
}

.cell-icon :deep(.van-icon) {
    font-size: 18px;
    color: #5297e0;
}

.cell-title {
    font-size: 16px;
    font-weight: 600;
    color: #2f3337;
}

.cell-meta {
    display: block;
    font-size: 13px;
    line-height: 18px;
    color: #6b7280;
}

.cell-time {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    line-height: 16px;
    color: #a3a8ae;
}

.delete-button {
    height: 100%;
}

.list-tip {
    margin: 14px 0 0;
    text-align: center;
    font-size: 12px;
    color: #a3a8ae;
}
</style>
