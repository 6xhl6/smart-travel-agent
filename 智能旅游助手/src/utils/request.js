import axios from 'axios'
import { useUserStore } from '@/store/user'
import router from '@/router'

const request = axios.create({
    baseURL: 'http://localhost:3500',
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

// 清空登录态并回到登录页；已在登录页时不再重复跳转
const forceLogout = () => {
    useUserStore().logout()
    if (router.currentRoute.value.name !== 'LoginIndex') {
        router.replace({ name: 'LoginIndex' })
    }
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

        // 令牌缺失或已过期：清空登录态并回到登录页
        const url = config?.url || ''
        if (response?.status === 401 && !NO_LOGOUT_URLS.some((item) => url.includes(item))) {
            forceLogout()
        }
        return Promise.reject(error)
    }
)

export default request
