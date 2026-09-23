import { createPinia } from 'pinia'
// 导入pinia持久化插件
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export { useUserStore } from './user'

export default pinia