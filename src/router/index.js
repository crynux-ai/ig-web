import {createRouter, createWebHashHistory} from 'vue-router'
import ModelInference from "../components/inference/ModelInference.vue";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/inference',
            name: 'ModelInference',
            component: ModelInference
        },
        {
            path: "/",
            redirect: "/inference"
        }
    ]
})

export default router
