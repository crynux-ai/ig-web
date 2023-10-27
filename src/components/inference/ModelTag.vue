<script setup>
import {useTaskStore} from "@/stores/task";

const props = defineProps(['closable'])
const taskStore = useTaskStore()

const removeLoraModel = () => {
    taskStore.inference_task.task_args.lora.model = "";
    taskStore.inference_task.custom_civitai_id = "";
};
</script>

<template>
    <div class="lora-model">
        <a-tag color="cyan" class="model-tag" v-if="taskStore.inference_task.task_args.lora.model !== ''" :closable="props.closable" @close="removeLoraModel()">
            Lora: {{ taskStore.inference_task.task_args.lora.model }}
        </a-tag>
        <a-tag color="cyan" class="model-tag" v-else-if="taskStore.inference_task.custom_civitai_id !== ''" :closable="props.closable" @close="removeLoraModel()">
            Lora: https://civitai.com/api/download/models/{{ taskStore.inference_task.custom_civitai_id }}
        </a-tag>
        <a-tag class="model-tag" v-else>
            Lora: not selected
        </a-tag>
    </div>
    <div class="base-model">
        <a-tag color="blue" class="model-tag">
            Base: {{ taskStore.inference_task.task_args.base_model }}
        </a-tag>
    </div>
</template>

<style scoped lang="stylus">
.base-model
    margin-top 4px
</style>
