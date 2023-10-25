import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css';

import App from './App.vue'
import router from './router'
import {createPersistedState} from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(createPersistedState({
    auto: true,
}));

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Antd)

app.mount('#app')
