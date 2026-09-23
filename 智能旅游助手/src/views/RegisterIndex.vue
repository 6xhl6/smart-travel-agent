<script setup>
import { ref } from 'vue'
import router from '@/router'
import { register } from '@/services/auth'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')

// 校验规则与后端 AuthService.register 保持一致：
// 用户名 /^[a-zA-Z0-9_]{3,20}$/，密码 /^[a-zA-Z0-9]{6,15}$/
// trigger: 'onSubmit' 让必填只在提交时校验；validateEmpty: false 让格式规则跳过空值，
// 因此失焦时若未输入任何内容不会触发校验
const usernameRules = [
    { required: true, message: '请输入用户名', trigger: 'onSubmit' },
    {
        pattern: /^[a-zA-Z0-9_]{3,20}$/,
        message: '只能包含字母、数字和下划线，长度 3-20 位',
        validateEmpty: false
    }
]

const passwordRules = [
    { required: true, message: '请输入密码', trigger: 'onSubmit' },
    {
        pattern: /^[a-zA-Z0-9]{6,15}$/,
        message: '只能包含字母和数字，长度 6-15 位',
        validateEmpty: false
    }
]

const confirmPasswordRules = [
    { required: true, message: '请再次输入密码', trigger: 'onSubmit' },
    {
        validator: (value) => value === password.value,
        message: '两次输入的密码不一致',
        validateEmpty: false
    }
]
const isRegistering = ref(false)
const onRegisterClick = async () => {
    if (isRegistering.value) return
    isRegistering.value = true
    try {
        const res = await register(username.value, password.value)
    console.log(res)
    // 后端返回200 且code为USER_EXISTS 时，用户名已存在
    if(res.data.code === 'USER_EXISTS') return showToast('用户名已存在')
    showToast('注册成功')
    isRegistering.value = false
    router.replace({ name: 'LoginIndex' , query:{ username: res.data.username }})
    } catch (error) {
        showToast(error.message)
        isRegistering.value = false
    }
}
</script>

<template>
    <div class="register-page">
        <!-- 顶部品牌区 -->
        <div class="hero">
            <div class="hero-bubble bubble-lg"></div>
            <div class="hero-bubble bubble-sm"></div>
            <div class="hero-bubble bubble-xs"></div>

            <div class="brand">
                <div class="brand-badge">
                    <van-icon name="guide-o" />
                </div>
                <h1 class="brand-title">智能旅游助手</h1>
                <p class="brand-slogan">发现旅途中的每一种可能</p>
            </div>
        </div>

        <!-- 表单卡片 -->
        <div class="register-card">
            <div class="card-head">
                <h2 class="card-title">创建账号</h2>
                <p class="card-subtitle">注册后即可保存行程与偏好</p>
            </div>

            <van-form class="form" @submit="onRegisterClick">
                <div class="field">
                    <van-icon class="field-icon" name="user-o" />
                    <van-field
                        v-model="username"
                        class="field-input"
                        name="username"
                        type="text"
                        placeholder="请输入用户名"
                        autocomplete="username"
                        :rules="usernameRules"
                    />
                </div>

                <div class="field">
                    <van-icon class="field-icon" name="closed-eye" />
                    <van-field
                        v-model="password"
                        class="field-input"
                        name="password"
                        type="password"
                        placeholder="请输入密码"
                        autocomplete="new-password"
                        :rules="passwordRules"
                    />
                </div>

                <div class="field">
                    <van-icon class="field-icon" name="shield-o" />
                    <van-field
                        v-model="confirmPassword"
                        class="field-input"
                        name="confirmPassword"
                        type="password"
                        placeholder="请再次输入密码"
                        autocomplete="new-password"
                        :rules="confirmPasswordRules"
                    />
                </div>

                <van-button class="submit-button" type="primary" block native-type="submit">
                    注 册
                </van-button>

                <p class="switch-tip">
                    已有账号？
                    <span class="switch-link" @click="router.replace({ name: 'LoginIndex' })">立即登录</span>
                </p>
            </van-form>
        </div>

        <!-- 底部航线装饰 -->
        <div class="footer">
            <svg class="flight-path" viewBox="0 0 240 46" fill="none" aria-hidden="true">
                <path
                    d="M6 40C46 6 194 6 234 34"
                    stroke="#c3d4e6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-dasharray="7 7"
                />
            </svg>
            <div class="footer-plane">
                <van-icon name="location-o" />
            </div>
            <p class="footer-text">开启下一段旅程</p>
        </div>
    </div>
</template>

<style scoped>
.register-page {
    position: relative;
    min-height: 100vh;
    box-sizing: border-box;
    padding-bottom: 28px;
    background-color: #f3f5f7;
    overflow: hidden;
}

/* 顶部品牌区域 */
.hero {
    position: relative;
    padding: 58px 24px 78px;
    background: linear-gradient(160deg, #3d7fc4 0%, #5297e0 45%, #74c3f1 100%);
    border-radius: 0 0 34px 34px;
    overflow: hidden;
}

.hero-bubble {
    position: absolute;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.13);
}

.bubble-lg {
    top: -54px;
    right: -46px;
    width: 168px;
    height: 168px;
}

.bubble-sm {
    top: 92px;
    left: -32px;
    width: 96px;
    height: 96px;
}

.bubble-xs {
    bottom: 16px;
    right: 62px;
    width: 44px;
    height: 44px;
    background-color: rgba(255, 255, 255, 0.18);
}

.brand {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.brand-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 70px;
    height: 70px;
    margin-bottom: 16px;
    color: #3d7fc4;
    font-size: 34px;
    background-color: #ffffff;
    border-radius: 22px;
    box-shadow: 0 10px 22px rgba(31, 74, 120, 0.22);
}

.brand-title {
    margin: 0;
    font-size: 23px;
    font-weight: 600;
    letter-spacing: 1px;
    color: #ffffff;
}

.brand-slogan {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 18px;
    letter-spacing: 0.6px;
    color: rgba(255, 255, 255, 0.88);
}

/* 表单卡片 */
.register-card {
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    margin: -44px 18px 0;
    padding: 26px 20px 24px;
    background-color: #ffffff;
    border-radius: 18px;
    box-shadow: 0 8px 26px rgba(31, 74, 120, 0.1);
}

.card-head {
    margin-bottom: 22px;
}

.card-title {
    margin: 0;
    font-size: 19px;
    font-weight: 600;
    color: #2f3337;
}

.card-subtitle {
    margin: 7px 0 0;
    font-size: 12px;
    line-height: 17px;
    color: #969ba1;
}

.form {
    display: flex;
    flex-direction: column;
}

/* 输入框：图标 + 输入区域合并成一个圆角条 */
.field {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    box-sizing: border-box;
    min-height: 48px;
    padding: 0 14px;
    margin-bottom: 14px;
    background-color: #f4f7fa;
    border: 1px solid #e4ebf2;
    border-radius: 12px;
    transition: border-color 0.2s, background-color 0.2s;
}

.field:focus-within {
    background-color: #ffffff;
    border-color: #74c3f1;
}

/* 校验失败：整条输入框高亮。Vant 的 Form.showError 默认关闭，
   校验失败时不会加 .van-field--error，但一定会渲染错误提示节点，故用它判断 */
.field:has(.van-field__error-message) {
    background-color: #fff8f8;
    border-color: #f2b8b8;
}

.field-icon {
    flex: 0 0 auto;
    margin-top: 15px;
    font-size: 17px;
    color: #8fb8db;
}

.field-input {
    flex: 1;
    min-width: 0;
    padding: 0;
    background-color: transparent;
}

.field-input :deep(.van-field__control) {
    height: 46px;
    font-size: 14px;
    line-height: 46px;
    color: #2f3337;
}

.field-input :deep(.van-field__control::placeholder) {
    font-size: 13px;
    color: #b3bcc5;
}

.field-input :deep(.van-field__error-message) {
    margin: 0 0 9px;
    font-size: 11px;
    line-height: 16px;
    color: #ee5c5c;
}

/* 提交按钮 */
.submit-button {
    height: 46px;
    margin-top: 8px;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 3px;
    background: linear-gradient(135deg, #5297e0 0%, #74c3f1 100%);
    border: none;
    border-radius: 12px;
    box-shadow: 0 8px 18px rgba(82, 151, 224, 0.32);
}

.submit-button:active {
    opacity: 0.88;
}

.switch-tip {
    margin: 18px 0 0;
    font-size: 12px;
    line-height: 17px;
    text-align: center;
    color: #969ba1;
}

.switch-link {
    color: #5297e0;
    font-weight: 500;
    cursor: pointer;
}

/* 底部航线装饰 */
.footer {
    position: relative;
    margin-top: 40px;
    text-align: center;
}

.flight-path {
    display: block;
    width: 240px;
    height: 46px;
    margin: 0 auto;
}

.footer-plane {
    position: absolute;
    top: 0;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    font-size: 14px;
    color: #ffffff;
    background: linear-gradient(135deg, #5297e0 0%, #74c3f1 100%);
    border-radius: 50%;
    transform: translateX(96px);
    box-shadow: 0 4px 10px rgba(82, 151, 224, 0.3);
}

.footer-text {
    margin: 10px 0 0;
    font-size: 11px;
    letter-spacing: 2px;
    color: #a8b2bd;
}

@media (min-width: 768px) {
    .register-card {
        max-width: 420px;
        margin-right: auto;
        margin-left: auto;
    }
}
</style>
