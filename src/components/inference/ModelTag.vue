<script setup>
const props = defineProps(['baseModelName', 'loraModelName', 'closable'])
const emit = defineEmits(['modelRemoved'])

const removeModel = (modelType) => {
    emit('modelRemoved', modelType);
};
</script>

<template>
    <div class="lora-model">
        <a-tag color="cyan" class="model-tag" v-if="props.loraModelName !== ''" :closable="props.closable" @close="removeModel('lora')">
            Lora: {{ props.loraModelName }}
        </a-tag>
        <a-tag class="model-tag" v-else>
            Lora: not selected
        </a-tag>
    </div>
    <div class="base-model">
        <a-tag color="blue" class="model-tag" v-if="props.baseModelName !== ''">
            Base: {{ props.baseModelName }}
        </a-tag>
        <a-tag color="red" class="model-tag" v-else>
            Base: not selected
        </a-tag>
    </div>
</template>

<style scoped lang="stylus">
.base-model
    margin-top 4px
</style>
