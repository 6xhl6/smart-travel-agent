import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'LayoutIndex',
        component: () => import('@/views/Layout/LayOut.vue'),
        redirect: '/home',
        children: [
            {
                path: '/home',
                name: 'HomeIndex',
                component: () => import('@/views/Layout/HomeIndex.vue'),
            },
            {
                path: '/dialog',
                name: 'DialogIndex',
                component: () => import('@/views/Layout/DialogIndex.vue'),
            },
            {
                path: '/my',
                name: 'MyIndex',
                component: () => import('@/views/Layout/MyIndex.vue'),
            },
        ]
    },
    {
        path: '/login',
        name: 'LoginIndex',
        component: () => import('@/views/LoginIndex.vue'),
    },
    {
        path: '/register',
        name: 'RegisterIndex',
        component: () => import('@/views/RegisterIndex.vue'),
    },
    {
        path: '/detail',
        name: 'DetailIndex',
        component: () => import('@/views/DetailIndex.vue'),
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
