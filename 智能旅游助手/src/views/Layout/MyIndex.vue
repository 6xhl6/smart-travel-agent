<script setup>
import { ref, computed } from 'vue'
import { uploadAvatar, resolveAvatarUrl } from '@/services/auth'
import { useUserStore } from '@/store/index'
import router from '@/router'

const APP_VERSION = 'v1.0.0'
const MAX_AVATAR_SIZE = 2 * 1024 * 1024

const onServiceClick = (name) => {
    showToast(`${name}功能开发中`)
}

const onAboutUs = () => {
    showDialog({
        title: '关于我们',
        message:
            '智能旅游助手是一款面向旅行者的智能规划工具，融合大模型能力，为你提供目的地推荐、行程编排、预算规划、实时问答等一站式服务。',
        confirmButtonText: '我知道了',
    })
}

const onVersion = () => {
    showDialog({
        title: '版本信息',
        message: `当前版本：${APP_VERSION}\n更新内容：优化聊天流式渲染体验，新增个人中心功能入口。`,
        confirmButtonText: '我知道了',
    })
}
// 登录态来自 user store（已持久化），后端通过 token 识别用户身份
const userStore = useUserStore()
const avatarUrl = ref(resolveAvatarUrl(userStore.user?.avatar))
const avatarUploader = ref(null)
const isUploading = ref(false)
// 前端简单判断登录态，用于页面展示。token 未登录时是空串，故用真值判断
const isLogin = computed(() => !!userStore.token)

// 点击头像
const onAvatarClick = () => {
    // 未登录时点击头像，跳转登录页
    console.log(isLogin.value)
    if (!isLogin.value){
        router.push('/login')
        return
    }
    if (isUploading.value) return
    showConfirmDialog({
        title: '修改头像',
        message: '是否修改头像？',
    })
        .then(() => {
            avatarUploader.value?.click()
        })
        .catch(() => {
            return
        })
}

const onFileChange = async (event) => {
    const file = event.target.files?.[0]
    // 立即重置，保证连续选择同一张图片也能再次触发 change
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件')
        return
    }
    if (file.size > MAX_AVATAR_SIZE) {
        showToast('图片大小不能超过 2MB')
        return
    }
    if (!userStore.token) {
        showToast('请先登录后再修改头像')
        return
    }

    const formData = new FormData()
    formData.append('file', file)

    isUploading.value = true
    try {
        const { data } = await uploadAvatar(formData)
        avatarUrl.value = resolveAvatarUrl(data.avatar)
        // 同步登录态，刷新后仍能展示最新头像
        userStore.setUser(data)
        showToast('头像更新成功')
    } catch (error) {
        showToast(error.response?.data?.msg || '头像上传失败，请稍后重试')
    } finally {
        isUploading.value = false
    }
}

// 退出登录：二次确认后清空本地登录态，并回到登录页
const onLogoutClick = () => {
    showConfirmDialog({
        title: '退出登录',
        message: '确定要退出当前账号吗？',
    })
        .then(() => {
            userStore.logout()
            // 清掉页面上的头像，避免退出后仍展示上一次的图片
            avatarUrl.value = ''
            showToast('已退出登录')
            router.replace({ name: 'LoginIndex' })
        })
        .catch(() => {
            return
        })
}
</script>

<template>
    <div class="my-page">
        <van-nav-bar title="我的" class="my-nav" />
        <div class="profile-header">
            <div class="profile-card">
                <div class="avatar" @click="onAvatarClick">
                    <img v-if="avatarUrl" class="avatar-img" :src="avatarUrl" alt="用户头像" />
                    <van-icon v-else class="default-avatar" name="user" />
                </div>
                <input
                    ref="avatarUploader"
                    class="avatar-input"
                    type="file"
                    accept="image/*"
                    @change="onFileChange"
                />
                <div class="right-content">
                    <div class="name">{{ isLogin ? userStore.user?.nickname : '点击头像登录' }}</div>
                    <div class="welcome">欢迎使用智能旅游助手</div>
                </div>
            </div>
        </div>

        <div class="group-card">
            <div class="group-title">我的服务</div>
            <van-cell-group class="cell-group" inset>
                <van-cell title="我的收藏" icon="star-o" is-link @click="onServiceClick('我的收藏')" />
                <van-cell title="历史记录" icon="clock-o" is-link @click="onServiceClick('历史记录')" />
                <van-cell title="设置" icon="setting-o" is-link @click="onServiceClick('设置')" />
            </van-cell-group>
        </div>

        <div class="group-card">
            <div class="group-title">关于</div>
            <van-cell-group class="cell-group" inset>
                <van-cell title="关于我们" icon="info-o" is-link @click="onAboutUs" />
                <van-cell title="版本信息" icon="flag-o" is-link @click="onVersion" />
            </van-cell-group>
        </div>

        <!-- 退出登录：仅登录后展示。结构与上方分组一致，靠红色区分危险操作 -->
        <div v-if="isLogin" class="group-card">
            <van-cell-group class="cell-group" inset>
                <van-cell class="logout-cell" title="退出登录" icon="revoke" @click="onLogoutClick" />
            </van-cell-group>
        </div>
    </div>
</template>

<style scoped>
.my-page {
    min-height: calc(100vh - 50px);
    display: flex;
    flex-direction: column;
    background-color: #f3f5f7;
    box-sizing: border-box;
    padding-bottom: 24px;
    overflow-y: auto;
}

.my-nav {
    border-bottom: 1px solid #eceff2;
}

/* 顶部用户信息渐变区域 */
.profile-header {
    padding: 18px 16px 22px;
    background: linear-gradient(135deg, #5297e0 0%, #74c3f1 100%);
    border-radius: 0 0 20px 20px;
}

.profile-card {
    display: flex;
    align-items: center;
    padding: 0 4px;
}

.avatar {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 72px;
    height: 72px;
    flex: 0 0 72px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.25);
    border: 2px solid rgba(255, 255, 255, 0.6);
    margin-right: 14px;
    overflow: hidden;
    cursor: pointer;

    .default-avatar {
        font-size: 34px;
        color: #fff;
    }

    .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

/* 隐藏原生文件选择框，仅通过 ref 触发 */
.avatar-input {
    display: none;
}

.right-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .name {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.welcome {
    margin-top: 8px;
    font-size: 13px;
    line-height: 18px;
    color: rgba(255, 255, 255, 0.92);
}

/* 分组卡片 */
.group-card {
    padding: 0 12px;
    margin-top: 20px;
}

.group-title {
    padding: 0 8px;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
}

.cell-group {
    border-radius: 12px;
    overflow: hidden;
}

.cell-group :deep(.van-cell) {
    background-color: #ffffff;
}

.cell-group :deep(.van-icon) {
    color: #5297e0;
    font-size: 20px;
}

/* 退出登录：沿用其它 cell 的高度与内边距，仅将文字与图标改为警示红 */
.cell-group .logout-cell :deep(.van-icon) {
    color: #ee5c5c;
}

.cell-group .logout-cell :deep(.van-cell__title) {
    color: #ee5c5c;
    font-weight: 500;
}

.logout-cell:active {
    background-color: #fff8f8;
}
</style>