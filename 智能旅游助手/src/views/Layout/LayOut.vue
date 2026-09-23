<template>
    <div>
        <router-view v-slot="{ Component }">
            <keep-alive>
                <component :is="Component" />
            </keep-alive>
        </router-view>
        <van-tabbar route>
            <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
            <van-tabbar-item to="/dialog" icon="chat-o">对话</van-tabbar-item>
            <van-tabbar-item to="/my" icon="user-o">我的</van-tabbar-item>
        </van-tabbar>
    </div>
</template>
