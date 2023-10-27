<script setup>
import {ref} from 'vue'
import config from '../../config.json'
import {useTaskStore} from "@/stores/task";
import InferenceRunner from "@/components/inference/InferenceRunner.vue";
import ModelSelector from "@/components/inference/ModelSelector.vue";
import ModelTag from "@/components/inference/ModelTag.vue";

const taskStore = useTaskStore();

const referencePoses = config.reference_poses;
const generatedImages = ref([]);

const referencePosesActiveKey = ref(['sitting']);

if (taskStore.inference_task.pose.category !== "") {
    referencePosesActiveKey.value = taskStore.inference_task.pose.category;
}

const selectPose = (category, index) => {

    if (taskStore.inference_task.pose.category === category && taskStore.inference_task.pose.index === index) {
        // Deselect action
        taskStore.inference_task.pose.category = '';
        taskStore.inference_task.pose.index = -1;
    } else {
        taskStore.inference_task.pose.category = category;
        taskStore.inference_task.pose.index = index;
    }
};

const clearImage = () => {
    generatedImages.value.length = 0;
};
const updateImage = (imageNum, imageDataURL) => {
    generatedImages.value.push(imageDataURL);
};

const imagePreviewVisible = ref(false);
const promptTabActiveKey = ref('positive');
</script>

<template>
    <div class="image-editor">
        <a-card class="generation-settings" title="Settings" size="small">
            <a-form
                :label-col="{ span: 12 }"
                :wrapper-col="{ span: 12 }"
                autocomplete="off"
              >
                <a-form-item label="Image width" name="image-width">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.task_config.image_width" placeholder="Image width" min="256" max="1024"/>
                </a-form-item>
                <a-form-item label="Image height" name="image-height">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.task_config.image_height" placeholder="Image height" min="256" max="1024" />
                </a-form-item>
                <a-form-item label="Steps" name="steps">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.task_config.steps" placeholder="Steps" min="20" max="100" />
                </a-form-item>
                <a-form-item label="Lora weight" name="weight">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.lora.weight" placeholder="Weight" min="0.1" max="1" :disabled="taskStore.inference_task.task_args.lora.model==='' && taskStore.inference_task.custom_civitai_id===''" />
                </a-form-item>
                <a-form-item label="Pose weight" name="pose-weight">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.controlnet.weight" placeholder="Pose weight" min="0.1" max="1" :disabled="taskStore.inference_task.pose.category===''" />
                </a-form-item>
                <a-form-item label="Num images" name="num-images">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.task_config.num_images" placeholder="Num images" min="1" max="9" />
                </a-form-item>
                <a-form-item label="CFG" name="cfg">
                    <a-input-number v-model:value.number="taskStore.inference_task.task_args.task_config.cfg" placeholder="CFG" min="1" max="15" />
                </a-form-item>
            </a-form>
        </a-card>
        <div class="pose-selection">
            <a-collapse v-model:activeKey="referencePosesActiveKey">
                <a-collapse-panel
                    :key="poseCategory"
                    :header="poseCategory"
                    v-for="poseCategory in Object.keys(referencePoses)"
                >
                    <div class="pose-image" v-for="i in referencePoses[poseCategory]"
                         :class="{'selected': taskStore.inference_task.pose.category === poseCategory && taskStore.inference_task.pose.index === i}"
                         @click="selectPose(poseCategory, i)">
                        <img
                            :src="'./poses/' + poseCategory + '/' + poseCategory + '_' + String(i).padStart(2, '0') + '.png'"/>
                    </div>

                </a-collapse-panel>
            </a-collapse>
        </div>
        <div class="image-view">
            <a-image-preview-group>
                <div class="image-wrapper" v-for="num in taskStore.inference_task.task_args.task_config.num_images">
                    <a-image
                        :preview="{ imagePreviewVisible: false }"
                        :src="generatedImages[num-1]"
                        @click="imagePreviewVisible = true"
                        v-if="generatedImages[num - 1]"
                    />
                    <img v-else alt="image placeholder"
                         src="data:image/png;base64,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"/>
                </div>
            </a-image-preview-group>
        </div>
    </div>
    <div class="bottom-bar">
        <div class="dataset-details">
            <div class="overview">
                <div class="name">Model Selection</div>
                <div class="select-model">
                    <model-selector></model-selector>
                </div>
                <div class="model-details">
                    <model-tag :closable="false"></model-tag>
                </div>
            </div>
            <div class="prompt">
                <a-tabs
                    v-model:activeKey="promptTabActiveKey"
                    tab-position="left"
                    size="small"
                    style="height:100%"
                >
                    <a-tab-pane key="positive" tab="Positive">
                        <a-textarea v-model:value="taskStore.inference_task.task_args.prompt" placeholder="a lazying man sitting on a brown chair" />
                    </a-tab-pane>
                    <a-tab-pane key="negative" tab="Negative">
                        <a-textarea v-model:value="taskStore.inference_task.task_args.negative_prompt" placeholder="lowres, bad anatomy, bad hands, missing fingers, worst quality, ..." />
                    </a-tab-pane>
                </a-tabs>
            </div>
            <div class="start-generating">
                <inference-runner
                    @image="updateImage"
                    @task-started="clearImage">
                </inference-runner>
            </div>
        </div>
    </div>
</template>
<style lang="stylus">
.select-model
    .select-model-btn
        width 48px
        height 48px

.prompt
    .ant-tabs-tab
        margin-top 4px !important
        padding 8px 12px !important
        font-size 12px !important
    .ant-tabs-content
        height 100%
        .ant-tabs-tabpane
            padding-left 6px !important
</style>

<style scoped lang="stylus">
.image-editor
    position absolute
    left 16px
    right 16px
    top 0
    bottom 100px
    z-index 10

    .generation-settings
        position absolute
        width 240px
        top 16px
        left 0

    .pose-selection
        position absolute
        width 200px
        right 0
        top 16px
        bottom 6px
        overflow-y auto

        .pose-image
            width 100%
            padding 16px
            margin-bottom 16px
            border 1px solid white
            cursor pointer

            &.selected, &.selected:hover
                border 1px solid #333333

            img
                display block
                width 100%

            &:hover
                border 1px solid #999999

    .image-view
        position relative
        margin-left 286px
        margin-right 226px

        padding-top 16px
        height 100%
        overflow-y auto

        -ms-overflow-style none;  /* IE and Edge */
        scrollbar-width none;  /* Firefox */
        &::-webkit-scrollbar    /* Chrome */
            display: none

        .image-wrapper
            position relative
            width 33%
            float left
            padding 16px
            text-align center

    .tags-editor
        position absolute
        width 300px
        right 6px
        top 0
        bottom 0
        overflow-y auto

.bottom-bar
    position absolute
    left 0
    right 0
    bottom 0
    height 100px
    border-top 1px solid #f0f0f0
    z-index 20
    background-color #f3f3f3

    .dataset-details
        padding 6px

        .overview
            position relative
            width 360px
            padding 2px 16px

            .select-model
                position absolute
                width 48px
                height 48px
                left 16px
                top 31px

            .model-details
                position relative
                margin-left 56px
                margin-top 6px

            .name
                font-weight 600
                white-space nowrap
                text-overflow ellipsis
                overflow hidden

        .prompt
            position absolute
            width 30%
            left 50%
            margin-left -15%
            top 8px
            bottom 8px
            border 1px solid #40a9ff
            border-radius 2px
            overflow hidden
            background-color white

            textarea
                display block!important
                width 100%!important
                height 100%!important
                border none
                resize none
                outline none

            textarea:focus
                outline 0 !important
                -webkit-appearance none
                box-shadow none !important

        .start-generating
            position absolute
            right 16px
            top 30px


</style>
