<script setup>
import {CodeOutlined, ClockCircleOutlined, CloseCircleOutlined, CheckCircleOutlined} from "@ant-design/icons-vue";
import {computed, onBeforeUnmount, onMounted, reactive, ref} from "vue";
import inferenceAPI from "@/api/v1/inference";
import {useTaskStore} from "@/stores/task";
import {useClientStore} from "@/stores/client";
import {InferenceTaskStatus} from "@/models/inference_task";
import config from "@/config.json";
import {message} from "ant-design-vue";

const props = defineProps(["pose", "baseModel", "loraModel"]);
const emit = defineEmits(["image", "taskStarted"]);
const taskStore = useTaskStore();
const clientStore = useClientStore();

const modalVisible = ref(false);
const isRunning = ref(false);

let traceTaskRunningStatusInterval = null;
const task = reactive({});
const latestTaskStatus = ref(0);

const manuallyShownModal = ref(false);

const showModal = async () => {
    manuallyShownModal.value = true;
    modalVisible.value = true
}

const hideModal = () => {
    modalVisible.value = false;
    manuallyShownModal.value = false;

    if (traceTaskRunningStatusInterval) {
        clearInterval(traceTaskRunningStatusInterval);
        traceTaskRunningStatusInterval = null;
    }
}

const run = async () => {
    isRunning.value = true;
    latestTaskStatus.value = 0;

    let poseDataURL = "";

    let taskArgs = JSON.parse(JSON.stringify(taskStore.inference_task.task_args))

    if (props.pose.category !== "" && props.pose.index !== "") {
        const poseImageUrl = "/poses/" + props.pose.category + "/"
            + props.pose.category + "_" + String(props.pose.index).padStart(2, '0') + '.png';

        poseDataURL = await inferenceAPI.getImageAsDataURL(poseImageUrl);
        taskArgs.controlnet.image_dataurl = poseDataURL;
    } else {
        taskArgs.controlnet = null;
    }

    if (taskArgs.lora.model === "") {
        taskArgs.lora = null;
    }

    try {
        const res = await inferenceAPI.createTask(
            clientStore.client_id,
            taskArgs
        );
    
        taskStore.inference_task.task_id = res.id;
        emit('taskStarted');

        modalVisible.value = true;
        await updateTaskStatus();
    } catch (e) {
        isRunning.value = false;
        message.error({
            content: e.toString()
        }, 5000);
    }
};

const notReadyToRun = computed(() => {
    return props.baseModel.value === ''
        || taskStore.inference_task.task_args.prompt === "";
});

const updateTaskStatus = async () => {
    if (taskStore.inference_task.task_id !== "") {
        isRunning.value = true;
        latestTaskStatus.value = 0;
        await fetchTaskStatus();
        traceTaskRunningStatusInterval = setInterval(fetchTaskStatus, 5000);
    }
};

const fetchTaskStatus = async () => {
    const newTask = await inferenceAPI.getTaskStatus(clientStore.client_id, taskStore.inference_task.task_id);

    Object.assign(task, newTask);

    if (task.status === InferenceTaskStatus.Success || task.status === InferenceTaskStatus.Aborted) {
        clearInterval(traceTaskRunningStatusInterval)
        traceTaskRunningStatusInterval = null;
        isRunning.value = false;

        if(task.status === InferenceTaskStatus.Success) {
            await downloadImages();

            if (!manuallyShownModal.value) {
                hideModal();
            }
        }

        // Let's just keep it so the user can still find the image after page refresh...
        // taskStore.clearInferenceTask();
    } else {
        latestTaskStatus.value = task.status;
    }
};

const downloadImages = async () => {
    for (let i = 0, l = taskStore.inference_task.task_args.task_config.num_images; i < l; i++) {
        const dataURL = await inferenceAPI.getImage(clientStore.client_id, taskStore.inference_task.task_id, i);
        emit('image', i, dataURL);
    }
};

const blockExplorer = config.block_explorer;

onMounted(async () => {
    await updateTaskStatus();
});

onBeforeUnmount(() => {
    clearInterval(traceTaskRunningStatusInterval);
    traceTaskRunningStatusInterval = null;
});
</script>

<template>
    <a-button type="primary" size="large" :loading="isRunning" :disabled="notReadyToRun" @click="run">Generate Image
    </a-button>

    <a-button size="large" class="runner-config" @click="showModal">
        <template #icon>
            <code-outlined/>
        </template>
    </a-button>

    <a-modal
        :visible="modalVisible"
        :footer="null"
        title="Task Executing Status"
        @ok="hideModal"
        @cancel="hideModal"
        width="800px"
        :destroy-on-close="true"
        :mask-closable="false"
    >
        <a-space direction="vertical" style="width: 100%" :size="40">
            <a-alert
                v-if="isRunning"
                :message="'The task is running on the Crynux Network'"
                type="success"
            />
            <a-alert
                v-if="!isRunning && !task.id" message="Task will be running on the Crynux Network" type="info"
            />
            <a-alert
                v-if="!isRunning && task.id && task.status === InferenceTaskStatus.Success" message="The task has finished successfully" type="success"
            />
            <a-alert
                v-if="!isRunning && task.id && task.status === InferenceTaskStatus.Aborted" message="The task has been aborted" type="error"
            />

            <div class="task-status">
                <a-timeline>
                    <a-timeline-item color="gray" v-if="!task.id">
                        Send the task to the Blockchain
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.Pending">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Sending the task to the Blockchain
                    </a-timeline-item>
                    <a-timeline-item color="green" v-if="task.id && latestTaskStatus > InferenceTaskStatus.Pending">
                        The task is sent to the Blockchain&nbsp;&nbsp;<a-typography-link :href='blockExplorer + "/" + task.tx_hash' target="_blank">({{ task.tx_hash.substring(0, 7) + "..." + task.tx_hash.substring(task.tx_hash.length - 5) }})</a-typography-link>
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.TransactionSent">
                        Wait for the Blockchain confirmation
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.TransactionSent">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Waiting for the Blockchain confirmation
                    </a-timeline-item>
                    <a-timeline-item color="green" v-if="task.id && latestTaskStatus >= InferenceTaskStatus.BlockchainConfirmed">
                        The task is confirmed on the Blockchain
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.BlockchainConfirmed">
                        Send the task to the relay
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.BlockchainConfirmed">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Sending the task to the relay
                    </a-timeline-item>
                    <a-timeline-item color="green" v-if="task.id && latestTaskStatus > InferenceTaskStatus.BlockchainConfirmed">
                        The task is sent to the relay
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.ParamsUploaded">
                        Execute the task on the computation nodes
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.ParamsUploaded">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Executing the task on the computation nodes
                    </a-timeline-item>
                    <a-timeline-item color="green" v-if="task.id && latestTaskStatus > InferenceTaskStatus.ParamsUploaded">
                        The task finished executing on the computation nodes
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.PendingResult">
                        Verify the images with the Blockchain
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.PendingResult">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Verifying the images with the Blockchain
                    </a-timeline-item>
                    <a-timeline-item color="green" v-if="task.id && latestTaskStatus > InferenceTaskStatus.PendingResult">
                        The images are uploaded and verified by the relay
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.Aborted">
                        Fetch the generated images
                    </a-timeline-item>
                    <a-timeline-item color="red" v-if="task.id && task.status === InferenceTaskStatus.Aborted">
                        <template #dot><close-circle-outlined style="font-size: 16px" /></template>
                        <div>There is something wrong. Please try again later.</div>
                        <a-typography-paragraph>
                            <pre>{{ task.abort_reason }}</pre>
                        </a-typography-paragraph>
                    </a-timeline-item>

                    <a-timeline-item color="green" v-if="task.id && task.status === InferenceTaskStatus.Success">
                        <template #dot><check-circle-outlined style="font-size: 16px" /></template>
                        The task is successfully finished.
                    </a-timeline-item>

                </a-timeline>
            </div>
        </a-space>
    </a-modal>
</template>

<style scoped lang="stylus">
.runner-config
    margin-left 6px

.task-status
    padding-left 16px
</style>
