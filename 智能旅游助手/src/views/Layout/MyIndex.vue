<script setup>
import { ref, computed, onActivated } from 'vue'
import { uploadAvatar, resolveAvatarUrl } from '@/services/auth'
import { useUserStore } from '@/store/index'
import router from '@/router'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024

// 登录态来自 user store（已持久化），后端通过 token 识别用户身份
const userStore = useUserStore()
const avatarUrl = ref(resolveAvatarUrl(userStore.user?.avatar))
const avatarUploader = ref(null)
const isUploading = ref(false)
// 前端简单判断登录态，用于页面展示。token 未登录时是空串，故用真值判断
const isLogin = computed(() => !!userStore.token)

// 收藏、历史记录都与用户绑定，未登录先引导登录
const goWithLogin = (name, label) => {
    if (!isLogin.value) {
        showConfirmDialog({
            title: '需要登录',
            message: `${label}需要登录后使用，是否前往登录？`,
            confirmButtonText: '去登录'
        })
            .then(() => router.push({ name: 'LoginIndex' }))
            .catch(() => { })
        return
    }
    router.push({ name })
}

const goFavorite = () => goWithLogin('FavoriteIndex', '查看收藏')
const goHistory = () => goWithLogin('HistoryIndex', '查看历史记录')
// 设置页含行程偏好，未登录也可进入，账号相关入口在页内自行判断
const goSetting = () => router.push({ name: 'SettingIndex' })

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

// 「我的」页被 keep-alive 缓存，退出登录或换账号后重新进入时要同步头像，
// 否则会残留上一个账号的图片
onActivated(() => {
    avatarUrl.value = resolveAvatarUrl(userStore.user?.avatar)
})
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
                <van-cell title="我的收藏" icon="star-o" is-link @click="goFavorite" />
                <van-cell title="历史记录" icon="clock-o" is-link @click="goHistory" />
                <van-cell title="设置" icon="setting-o" is-link @click="goSetting" />
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
</style>