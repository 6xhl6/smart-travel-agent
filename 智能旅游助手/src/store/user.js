import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 登录态：令牌与用户信息
 * 通过 pinia-plugin-persistedstate 持久化，刷新页面后仍保持登录
 */
export const useUserStore = defineStore(
    'user',
    () => {
        const token = ref('')
        const user = ref(null)

        const setToken = (value) => {
            token.value = value || ''
        }
        const setUser = (value) => {
            user.value = value || null
        }
        // 登录成功后一次性写入令牌与用户信息
        const setAuth = (payload = {}) => {
            setToken(payload.token)
            setUser(payload.user)
        }
        const logout = () => {
            token.value = ''
            user.value = null
        }

        return { token, user, setToken, setUser, setAuth, logout }
    },
    {
        persist: true,
    }
)
