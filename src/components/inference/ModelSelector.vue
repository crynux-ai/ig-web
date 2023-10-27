<script setup>
import { RadarChartOutlined } from "@ant-design/icons-vue";
import {ref, watch} from "vue";
import ModelTag from "@/components/inference/ModelTag.vue";
import modelAPI from "@/api/v1/model";
import v1 from "@/api/v1/v1";
import {useTaskStore} from "@/stores/task";
import {BaseModelTypeDisplayNames} from "@/models/base_model";

const taskStore = useTaskStore();

const modalVisible = ref(false);
const activeModelTabKey = ref('base');

const baseModels = ref([]);
const loraModels = ref([]);

const showModal = async () => {
    modalVisible.value = true;
    await loadModels();
}

const hideModal = () => {
    modalVisible.value = false;
}

const loadModels = async () => {
    baseModels.value = await modelAPI.getBaseModels();
    loraModels.value = await modelAPI.getLoraModels(taskStore.inference_task.base_model_type);
};

watch(() => taskStore.inference_task.base_model_type, async (newValue, oldValue) => {
    if (newValue !== oldValue) {
        loraModels.value = await modelAPI.getLoraModels(taskStore.inference_task.base_model_type);
    }
});

const modelListElementPerRow = 6;
const getElementNumForRow = (rowIndex, models) => {
    if(rowIndex === Math.ceil(models.length / modelListElementPerRow)) {
        return (models.length-1) % modelListElementPerRow + 1;
    } else {
        return modelListElementPerRow;
    }
};
const getElementIndexByRowAndCol = (rowIndex, colIndex) => {
    return (rowIndex-1) * modelListElementPerRow + colIndex - 1;
};

const selectBaseModel = (rowIndex, colIndex) => {
    const elemIdx = getElementIndexByRowAndCol(rowIndex, colIndex)

    taskStore.inference_task.task_args.base_model = baseModels.value[elemIdx].key;
    taskStore.changeBaseModel(baseModels.value[elemIdx].key, baseModels.value[elemIdx].type)
};
const selectLoRAModel = (rowIndex, colIndex) => {
    taskStore.inference_task.custom_civitai_id = '';
    taskStore.inference_task.task_args.lora.model = loraModels.value[getElementIndexByRowAndCol(rowIndex, colIndex)].download_link;
};

const baseURL = v1.getBaseURL();
</script>

<template>
    <a-button size="large" class="select-model-btn" @click="showModal">
        <template #icon>
            <radar-chart-outlined />
        </template>
    </a-button>
    <a-modal
    :visible="modalVisible"
    @ok="hideModal"
    @cancel="hideModal"
    width="1000px"
    :destroy-on-close="true"
    :mask-closable="false"
    >
        <template #title>
            <div class="page-tabs">
                <div class="title">Select Models</div>
                <a-radio-group v-model:value="activeModelTabKey" button-style="solid">
                    <a-radio-button value="base">Base Models</a-radio-button>
                    <a-radio-button value="lora">LoRA Models</a-radio-button>
                </a-radio-group>
            </div>
        </template>
        <div class="base-models model-list" v-if="activeModelTabKey==='base'">
            <a-row v-for="rowIndex in Math.ceil(baseModels.length / modelListElementPerRow)">
                <a-col v-for="colIndex in getElementNumForRow(rowIndex, baseModels)" :span="24 / modelListElementPerRow">
                    <a-card
                        :class="{'model-card':true,'selected':baseModels[getElementIndexByRowAndCol(rowIndex, colIndex)].key === taskStore.inference_task.task_args.base_model}" hoverable size="small"
                        style="width: 90%; margin:0 auto 16px"
                        @click="selectBaseModel(rowIndex, colIndex)"
                    >
                        <template #cover>
                            <img alt="model image" :src='baseURL + "/images/models/base/" + baseModels[getElementIndexByRowAndCol(rowIndex, colIndex)].key + ".png"' />
                        </template>
                        <a-card-meta>
                            <template #title>
                                <a class="model-card-title" :href="baseModels[getElementIndexByRowAndCol(rowIndex, colIndex)].link" target="_blank">{{ baseModels[getElementIndexByRowAndCol(rowIndex, colIndex)].name }}</a>
                            </template>
                            <template #description>
                                <div class="model-card-description">
                                    {{ baseModels[getElementIndexByRowAndCol(rowIndex, colIndex)].description }}
                                </div>
                                <div>
                                    <a-tag color="cyan">{{ BaseModelTypeDisplayNames[baseModels[getElementIndexByRowAndCol(rowIndex, colIndex)].type] }}</a-tag>
                                </div>
                            </template>
                        </a-card-meta>
                    </a-card>
                </a-col>
            </a-row>
        </div>
        <div class="lora-models model-list" v-if="activeModelTabKey==='lora'">
            <a-row v-for="rowIndex in Math.ceil(loraModels.length / modelListElementPerRow)">
                <a-col v-for="colIndex in getElementNumForRow(rowIndex, loraModels)" :span="24 / modelListElementPerRow">
                    <a-card
                        :class="{'model-card':true,'selected':loraModels[getElementIndexByRowAndCol(rowIndex, colIndex)].download_link === taskStore.inference_task.task_args.lora.model && taskStore.inference_task.custom_civitai_id === ''}" hoverable size="small"
                        style="width: 90%; margin:0 auto 16px"
                        @click="selectLoRAModel(rowIndex, colIndex)"
                    >
                        <template #cover>
                            <img alt="model image" :src='baseURL + "/images/models/lora/" + loraModels[getElementIndexByRowAndCol(rowIndex, colIndex)].id + ".png"' />
                        </template>
                        <a-card-meta>
                            <template #title>
                                <a class="model-card-title" :href='loraModels[getElementIndexByRowAndCol(rowIndex, colIndex)].display_link' target="_blank">{{ loraModels[getElementIndexByRowAndCol(rowIndex, colIndex)].name }}</a>
                            </template>
                            <template #description>
                                <div class="model-card-description">
                                    {{ loraModels[getElementIndexByRowAndCol(rowIndex, colIndex)].description }}
                                </div>
                                <div>
                                    <a-tag color="cyan">{{ BaseModelTypeDisplayNames[loraModels[getElementIndexByRowAndCol(rowIndex, colIndex)].type] }}</a-tag>
                                </div>
                            </template>
                        </a-card-meta>
                    </a-card>
                </a-col>
            </a-row>
            <a-row>
                <a-col :span="24">
                    <a-card
                        :class="{'custom-lora-model':true,'selected':taskStore.inference_task.custom_civitai_id !== ''}"
                    >
                        <a-typography-title :level="5">Use a LoRA model from CivitAI</a-typography-title>
                        <a-typography-paragraph>
                            Go to <a-typography-link href="https://civitai.com/tag/lora" target="_blank">https://civitai.com</a-typography-link>, find the LoRA model that fits your need, and paste the model download link here.
                        </a-typography-paragraph>
                        <a-input
                            v-model:value="taskStore.inference_task.custom_civitai_id"
                            addon-before="https://civitai.com/api/download/models/"
                            placeholder="123456"
                            style="width: 400px"
                            allow-clear />
                    </a-card>
                </a-col>
            </a-row>
        </div>
        <template #footer>
            <div class="selected-models">
                <model-tag :closable="true"></model-tag>
            </div>
            <a-button class="model-selector-ok-btn" type="primary" @click="hideModal">OK</a-button>
        </template>
    </a-modal>
</template>
<style lang="stylus">
.model-list
    .model-card, .custom-lora-model
        .ant-card-meta-title
            margin-bottom 0 !important

        &.selected
            border-color #1890ff
</style>

<style scoped lang="stylus">
.page-tabs
    text-align center

    .title
        position absolute
        left 32px
        top 22px
        font-size 24px

.model-list
    overflow auto
    padding-bottom 16px

    .model-card
        .model-card-title
            color #333
            font-size 13px
            margin-bottom 4px

            &:hover
                color #1890ff

        .model-card-description
            height 60px
            overflow hidden
            font-size 12px

.selected-models
    text-align left
    margin-left 16px

.model-selector-ok-btn
    position absolute
    right 20px
    bottom 16px
</style>
