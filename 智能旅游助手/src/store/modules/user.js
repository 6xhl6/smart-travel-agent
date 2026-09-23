import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
    const token = ref('')
    const user = ref(null)
    const setUser = (user) => {
        user.value = user
    }
    const setToken = (token) => {
        token.value = token
    }
    return { token, user, setUser, setToken }
},{
    persist: true,
})