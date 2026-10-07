import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 行程偏好：设置页里配置的默认规划参数，首页表单打开时用它预填
 * 只存在本地，通过 pinia-plugin-persistedstate 持久化，无需后端参与
 */
export const useSettingsStore = defineStore(
    'settings',
    () => {
        const defaultBudget = ref(3000)
        const defaultDays = ref(3)

        const setDefaultBudget = (value) => {
            defaultBudget.value = Number(value) || 0
        }
        const setDefaultDays = (value) => {
            defaultDays.value = Number(value) || 0
        }

        return { defaultBudget, defaultDays, setDefaultBudget, setDefaultDays }
    },
    {
        persist: true,
    }
)
