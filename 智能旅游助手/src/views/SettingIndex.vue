<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { updateProfile, updatePassword, removeAccount } from '@/services/auth'
import { clearFavorites } from '@/services/favorite'
import { clearHistories } from '@/services/history'
import { useUserStore, useSettingsStore, useChatStore } from '@/store/index'

const APP_VERSION = 'v1.0.0'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const chatStore = useChatStore()

const isLogin = computed(() => !!userStore.token)
const nickname = computed(
    () => userStore.user?.nickname || userStore.user?.username || '未设置'
)

// 账号类操作都需要登录，未登录时统一引导
const ensureLogin = () => {
    if (isLogin.value) return true
    showConfirmDialog({
        title: '需要登录',
        message: '该操作需要登录后使用，是否前往登录？',
        confirmButtonText: '去登录'
    })
        .then(() => router.push({ name: 'LoginIndex' }))
        .catch(() => { })
    return false
}

const onClickLeft = () => {
    router.back()
}

const showNicknameDialog = ref(false)
const nicknameInput = ref('')

const onNicknameClick = () => {
    if (!ensureLogin()) return
    nicknameInput.value = userStore.user?.nickname || ''
    showNicknameDialog.value = true
}

// 用 before-close 接管关闭时机：校验或请求失败时保持弹窗打开，便于直接改
const onNicknameBeforeClose = async (action) => {
    if (action !== 'confirm') return true
    const value = nicknameInput.value.trim()
    if (!value) {
        showToast('昵称不能为空')
        return false
    }
    try {
        const { data } = await updateProfile(value)
        // 同步本地登录态，个人中心展示的昵称立即生效
        userStore.setUser(data)
        showToast('昵称已更新')
        return true
    } catch (error) {
        showToast(error.message || '昵称修改失败，请稍后重试')
        return false
    }
}

/* ---------------- 密码 ---------------- */
const showPasswordDialog = ref(false)
const passwordForm = ref({ oldPassword: '', newPassword: '', confirm: '' })

const onPasswordClick = () => {
    if (!ensureLogin()) return
    passwordForm.value = { oldPassword: '', newPassword: '', confirm: '' }
    showPasswordDialog.value = true
}

const onPasswordBeforeClose = async (action) => {
    if (action !== 'confirm') return true
    const { oldPassword, newPassword, confirm } = passwordForm.value
    if (!oldPassword || !newPassword) {
        showToast('请填写原密码和新密码')
        return false
    }
    if (newPassword !== confirm) {
        showToast('两次输入的新密码不一致')
        return false
    }
    try {
        await updatePassword(oldPassword, newPassword)
        // 密码已变更，本地令牌不再可信，清掉登录态要求重新登录
        userStore.logout()
        showToast('密码修改成功，请重新登录')
        router.replace({ name: 'LoginIndex' })
        return true
    } catch (error) {
        showToast(error.message || '密码修改失败，请稍后重试')
        return false
    }
}

/* ---------------- 数据管理 ---------------- */
const onClearChatClick = () => {
    showConfirmDialog({
        title: '清空对话记录',
        message: '确定要清空与旅行助手的全部对话吗？'
    })
        .then(() => {
            chatStore.clearConversation()
            showToast('已清空对话记录')
        })
        .catch(() => { })
}

const onClearHistoriesClick = () => {
    if (!ensureLogin()) return
    showConfirmDialog({
        title: '清空历史记录',
        message: '清空后无法恢复，确定继续吗？',
        confirmButtonColor: '#e8463a'
    })
        .then(async () => {
            try {
                const { data } = await clearHistories()
                showToast(`已清空 ${data?.count ?? 0} 条记录`)
            } catch (error) {
                showToast(error.message || '清空失败，请稍后重试')
            }
        })
        .catch(() => { })
}

const onClearFavoritesClick = () => {
    if (!ensureLogin()) return
    showConfirmDialog({
        title: '清空我的收藏',
        message: '清空后无法恢复，确定继续吗？',
        confirmButtonColor: '#e8463a'
    })
        .then(async () => {
            try {
                const { data } = await clearFavorites()
                showToast(`已清空 ${data?.count ?? 0} 条收藏`)
            } catch (error) {
                showToast(error.message || '清空失败，请稍后重试')
            }
        })
        .catch(() => { })
}

/* ---------------- 关于 ---------------- */
const onAboutUs = () => {
    showDialog({
        title: '关于我们',
        message:
            '智能旅游助手是一款面向旅行者的智能规划工具，融合大模型能力，为你提供目的地推荐、行程编排、预算规划、实时问答等一站式服务。',
        confirmButtonText: '我知道了'
    })
}

const onAgreement = () => {
    showDialog({
        title: '用户协议',
        message:
            '本应用提供的行程与预算均由 AI 生成，仅供参考，请以景区、酒店等官方信息为准，出行前请再次核实。请勿利用本应用发布违法违规内容。',
        confirmButtonText: '我知道了'
    })
}

const onPrivacy = () => {
    showDialog({
        title: '隐私政策',
        message:
            '我们仅保存你的账号、头像、收藏与历史记录，用于登录与数据同步，不会向第三方提供。你可以随时在数据管理中清空这些数据，或注销账号一并删除。',
        confirmButtonText: '我知道了'
    })
}

const onVersion = () => {
    showDialog({
        title: '版本信息',
        message: `当前版本：${APP_VERSION}\n更新内容：新增设置页，支持行程偏好、账号安全与数据管理。`,
        confirmButtonText: '我知道了'
    })
}

/* ---------------- 退出与注销 ---------------- */
const onLogout = () => {
    showConfirmDialog({
        title: '退出登录',
        message: '确定要退出当前账号吗？'
    })
        .then(() => {
            userStore.logout()
            showToast('已退出登录')
            router.replace({ name: 'LoginIndex' })
        })
        .catch(() => { })
}

const onRemoveAccount = () => {
    if (!ensureLogin()) return
    showConfirmDialog({
        title: '注销账号',
        message: '注销后将删除你的登录信息、收藏与历史记录，且无法恢复。',
        confirmButtonText: '确认注销',
        confirmButtonColor: '#e8463a'
    })
        .then(async () => {
            try {
                await removeAccount()
                userStore.logout()
                showToast('账号已注销')
                router.replace({ name: 'LoginIndex' })
            } catch (error) {
                showToast(error.message || '注销失败，请稍后重试')
            }
        })
        .catch(() => { })
}
</script>

<template>
    <div class="setting-page">
        <van-nav-bar title="设置" left-text="返回" left-arrow @click-left="onClickLeft" />

        <section v-if="isLogin" class="group">
            <p class="group-title">账号与安全</p>
            <van-cell-group inset>
                <van-cell title="昵称" :value="nickname" is-link @click="onNicknameClick" />
                <van-cell title="修改密码" is-link @click="onPasswordClick" />
                <van-cell class="danger-cell" title="注销账号" is-link @click="onRemoveAccount" />
            </van-cell-group>
        </section>

        <section class="group">
            <p class="group-title">行程偏好</p>
            <van-cell-group inset>
                <van-cell title="默认预算" center>
                    <template #value>
                        <van-stepper :model-value="settingsStore.defaultBudget" :min="100" :max="100000"
                            :step="500" input-width="52px" button-size="24px"
                            @change="settingsStore.setDefaultBudget" />
                    </template>
                </van-cell>
                <van-cell title="默认天数" center>
                    <template #value>
                        <van-stepper :model-value="settingsStore.defaultDays" :min="1" :max="30" :step="1"
                            input-width="52px" button-size="24px" @change="settingsStore.setDefaultDays" />
                    </template>
                </van-cell>
            </van-cell-group>
            <p class="group-tip">首页规划行程时会用这里的预算与天数预填</p>
        </section>

        <section class="group">
            <p class="group-title">数据管理</p>
            <van-cell-group inset>
                <van-cell title="清空对话记录" is-link @click="onClearChatClick" />
                <van-cell title="清空历史记录" is-link @click="onClearHistoriesClick" />
                <van-cell title="清空我的收藏" is-link @click="onClearFavoritesClick" />
            </van-cell-group>
        </section>

        <section class="group">
            <p class="group-title">关于</p>
            <van-cell-group inset>
                <van-cell title="关于我们" is-link @click="onAboutUs" />
                <van-cell title="用户协议" is-link @click="onAgreement" />
                <van-cell title="隐私政策" is-link @click="onPrivacy" />
                <van-cell title="版本信息" :value="APP_VERSION" is-link @click="onVersion" />
            </van-cell-group>
        </section>

        <van-button v-if="isLogin" class="logout-button" block round @click="onLogout">
            退出登录
        </van-button>
    </div>

    <van-dialog v-model:show="showNicknameDialog" title="修改昵称" show-cancel-button
        :before-close="onNicknameBeforeClose">
        <div class="dialog-body">
            <van-field v-model="nicknameInput" maxlength="12" placeholder="请输入新昵称" clearable />
        </div>
    </van-dialog>

    <van-dialog v-model:show="showPasswordDialog" title="修改密码" show-cancel-button
        :before-close="onPasswordBeforeClose">
        <div class="dialog-body">
            <van-field v-model="passwordForm.oldPassword" type="password" label="原密码" placeholder="请输入原密码" />
            <van-field v-model="passwordForm.newPassword" type="password" label="新密码" placeholder="6-15 位字母或数字" />
            <van-field v-model="passwordForm.confirm" type="password" label="确认新密码" placeholder="请再次输入新密码" />
        </div>
    </van-dialog>
</template>

<style scoped>
.setting-page {
    min-height: 100vh;
    box-sizing: border-box;
    padding-bottom: 24px;
    background-color: #f3f5f7;
}

.group {
    margin-top: 12px;
}

.group-title {
    margin: 0 0 8px;
    padding: 0 16px;
    font-size: 13px;
    line-height: 18px;
    color: #8b9198;
}

.group-tip {
    margin: 8px 16px 0;
    font-size: 12px;
    line-height: 18px;
    color: #a3a8ae;
}

.danger-cell :deep(.van-cell__title) {
    color: #e8463a;
}

.logout-button {
    margin-top: 24px;
    color: #e8463a;
    border-color: #f3d0cc;
}

.dialog-body {
    padding: 16px 0 4px;
}
</style>
