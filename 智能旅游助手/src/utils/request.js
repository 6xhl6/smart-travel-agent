import axios from 'axios'
import { useUserStore } from '@/store/user'
import router from '@/router'

// 根据不同部署环境配置 baseURL，开发环境在 .env.development 中指向本地后端，
// 生产环境同域部署（nginx 反代 /api）时留空，走相对路径即可
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 120000,
})

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        // 已登录时自动携带令牌，供后端 requireAuth 校验
        const { token } = useUserStore()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        // 仅处理“请求未能发出”的情况（如请求被取消、config 处理抛错）
        return Promise.reject(error)
    }
)

// 令牌失效：清空登录态并引导用户重新登录
// 页面并发发起多个请求时可能同时拿到 401，用一个标记保证弹窗只出现一次
let isAuthExpired = false
export const handleAuthExpired = () => {
    if (isAuthExpired) return
    isAuthExpired = true
    // 令牌已经无效，先清掉本地登录态，避免界面继续停留在“已登录”的样子
    useUserStore().logout()
    showConfirmDialog({
        title: '登录已过期',
        message: '登录状态已过期，请重新登录',
        confirmButtonText: '重新登录',
        confirmButtonColor: '#1989fa',
        theme: 'round-button',
        // 令牌已经失效，此时没有“取消后继续用”的选项，只保留确认按钮
        showCancelButton: false,
        closeOnClickOverlay: false
    })
        .then(() => {
            if (router.currentRoute.value.name !== 'LoginIndex') {
                router.replace({ name: 'LoginIndex' })
            }
        })
        .catch(() => { })
        .finally(() => {
            isAuthExpired = false
        })
}

// 这些接口的 401 属于业务结果（账号密码错误），不触发登出跳转
const NO_LOGOUT_URLS = ['/auth/login', '/auth/register']

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        // 去掉外层的 data 包装
        return response.data
    },
    (error) => {
        const { response, config } = error
        // 统一把后端返回的提示改写到 error.message，调用方只需读 error.message
        // 无 response 的错误（超时 / 断网）没有后端提示，这里给出中文兜底
        error.message =
            response?.data?.msg ||
            (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '') ||
            (response ? error.message : '网络异常，请检查网络连接')

        // 令牌缺失或已过期：提示用户并回到登录页
        const url = config?.url || ''
        if (response?.status === 401 && !NO_LOGOUT_URLS.some((item) => url.includes(item))) {
            handleAuthExpired()
        }
        return Promise.reject(error)
    }
)

export default request
