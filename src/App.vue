<script setup>
import {RouterView} from 'vue-router'
import {useClientStore} from "@/stores/client";
import {v4 as uuidV4} from "uuid";

const clientStore = useClientStore()
if(clientStore.client_id === '') {
    clientStore.client_id = uuidV4();
}

</script>

<template>
    <div class="main-page">
        <RouterView/>
    </div>
</template>
<style scoped lang="stylus">
.main-page
    position absolute
    left 0
    right 0
    top 0
    bottom 0
    -webkit-app-region drag

.logo
    height 60px
    padding 32px 24px
    font-size 28px

.main-config
    position absolute
    bottom 8px
    left 8px
</style>

<style>
.main-page * {
    -webkit-app-region: no-drag;
}
.ant-menu-item {
     -webkit-app-region: no-drag;
}
</style>
