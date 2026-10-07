import { JSONFilePreset } from 'lowdb/node'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(__dirname, 'db.json')

// lowdb 会把整个文件读进内存，如果每个 Service 各持一份实例，
// 写入时会用各自的快照覆盖整个文件，导致另一方的数据丢失，
// 因此这里用单例把同一个实例共享给所有 Service
let dbPromise = null

/**
 * 获取 lowdb 实例（首次调用时初始化）
 * @returns {Promise<import('lowdb').Low<{ users: object[], favorites: object[], histories: object[] }>>}
 */
export const getDB = () => {
    if (!dbPromise) {
        dbPromise = (async () => {
            await fs.mkdir(__dirname, { recursive: true })
            const db = await JSONFilePreset(file, { users: [], favorites: [], histories: [] })
            // 兼容旧数据文件：缺少的集合补上空数组
            db.data.users ||= []
            db.data.favorites ||= []
            db.data.histories ||= []
            return db
        })()
    }
    return dbPromise
}
