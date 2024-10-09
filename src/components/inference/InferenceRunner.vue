<script setup>
import { CodeOutlined, ClockCircleOutlined, CloseCircleOutlined, CheckCircleOutlined } from "@ant-design/icons-vue";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import inferenceAPI from "@/api/v1/inference";
import networkAPI from "@/api/v1/network";
import applicationAPI from '@/api/v1/applicatioin';
import { useTaskStore } from "@/stores/task";
import { useClientStore } from "@/stores/client";
import { InferenceTaskStatus } from "@/models/inference_task";
import config from "@/config.json";
import { message } from "ant-design-vue";
import { BaseModelType } from "@/models/base_model";

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
    await updateNetworkStats();
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

    taskStore.inference_task.task_args.task_config.seed = Math.round(Math.random() * 100000000)

    const taskArgsJson = await taskStore.taskArgsJson;
    const modelType = taskStore.inference_task.base_model_type;

    let vramLimit = undefined;
    if (modelType === BaseModelType.SD15) {
        vramLimit = 8;
    } else if (modelType === BaseModelType.SD21 || modelType === BaseModelType.SDXL) {
        vramLimit = 10;
    }

    try {
        const res = await inferenceAPI.createTask(
            clientStore.client_id,
            taskArgsJson,
            0,
            vramLimit,
        );

        taskStore.inference_task.task_id = res.id;
        emit('taskStarted');

        modalVisible.value = true;
        await updateNetworkStats();
        await updateTaskStatus();
    } catch (e) {
        isRunning.value = false;
        message.error({
            content: e.toString()
        }, 5000);
    }
};

const notReadyToRun = computed(() => {
    return taskStore.inference_task.task_args.base_model === ''
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

        if (task.status === InferenceTaskStatus.Success) {
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


const networkTotalNodes = ref(0);
const networkAvailableNodes = ref(0);
const updateNetworkStats = async () => {
    try {
        const nodeStats = await networkAPI.getNodeStats();
        networkTotalNodes.value = nodeStats.num_total_nodes;
        networkAvailableNodes.value = nodeStats.num_available_nodes;
    } catch (e) {
        console.log(e);
    }
};

const appWalletAddress = ref('');
const appWalletCNXBalance = ref(0);

const toEtherValue = (bigNum) => {
    if (bigNum === 0) return 0

    const decimals = (bigNum / BigInt(1e18)).toString()

    let fractions = ((bigNum / BigInt(1e16)) % 100n).toString()

    if (fractions.length === 1) fractions += '0'

    return decimals + '.' + fractions
}

onMounted(async () => {
    await updateTaskStatus();

    const walletBalance = await applicationAPI.getWalletBalance();

    appWalletCNXBalance.value = toEtherValue(walletBalance.balance);
    appWalletAddress.value = walletBalance.address;
});

onBeforeUnmount(() => {
    clearInterval(traceTaskRunningStatusInterval);
    traceTaskRunningStatusInterval = null;
});
</script>

<template>
    <a-button type="primary" size="large" :loading="isRunning" :disabled="notReadyToRun" @click="run">Generate Image (30
        CNX)
    </a-button>

    <a-button size="large" class="runner-config" @click="showModal">
        <template #icon>
            <code-outlined />
        </template>
    </a-button>

    <div class="wallet-balance">
        <a-typography-link class="balance-link" :href='blockExplorer + "/address/" + appWalletAddress'
            target="_blank">
            Application wallet: {{ appWalletCNXBalance }} CNX
        </a-typography-link>
    </div>

    <a-modal :visible="modalVisible" title="Task Executing Status" @ok="hideModal" @cancel="hideModal" width="800px"
        :destroy-on-close="true" :mask-closable="false">
        <a-space direction="vertical" style="width: 100%" :size="40">
            <a-alert v-if="isRunning" :message="'The task is running on the Crynux Network'" type="success" />
            <a-alert v-if="!isRunning && !task.id" message="Task will be running on the Crynux Network" type="info" />
            <a-alert v-if="!isRunning && task.id && task.status === InferenceTaskStatus.Success"
                message="The task has finished successfully" type="success" />
            <a-alert v-if="!isRunning && task.id && task.status === InferenceTaskStatus.Aborted"
                message="The task has been aborted" type="error" />

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
                        The task is sent to the Blockchain&nbsp;&nbsp;<a-typography-link
                            :href='blockExplorer + "/tx/" + task.tx_hash' target="_blank">({{ task.tx_hash.substring(0, 7) +
                                "..." + task.tx_hash.substring(task.tx_hash.length - 5) }})</a-typography-link>
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.TransactionSent">
                        Wait for the Blockchain confirmation
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.TransactionSent">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Waiting for the Blockchain confirmation
                    </a-timeline-item>
                    <a-timeline-item color="green"
                        v-if="task.id && latestTaskStatus >= InferenceTaskStatus.BlockchainConfirmed">
                        The task is confirmed on the Blockchain
                    </a-timeline-item>

                    <a-timeline-item color="gray"
                        v-if="!task.id || latestTaskStatus < InferenceTaskStatus.BlockchainConfirmed">
                        Send the task to the relay
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.BlockchainConfirmed">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        Sending the task to the relay
                    </a-timeline-item>
                    <a-timeline-item color="green"
                        v-if="task.id && latestTaskStatus > InferenceTaskStatus.BlockchainConfirmed">
                        The task is sent to the relay
                    </a-timeline-item>

                    <a-timeline-item color="gray" v-if="!task.id || latestTaskStatus < InferenceTaskStatus.ParamsUploaded">
                        Execute the task on the nodes
                    </a-timeline-item>
                    <a-timeline-item v-if="task.id && latestTaskStatus === InferenceTaskStatus.ParamsUploaded">
                        <template #dot><clock-circle-outlined style="font-size: 16px" /></template>
                        The task is executing on the nodes
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
                        The task has finished successfully.
                    </a-timeline-item>
                </a-timeline>
            </div>
        </a-space>
        <template #footer>
            <a-typography-link class="network-stats" :href="config.network_monitor" target="_blank">
                Currently available nodes: {{ networkAvailableNodes + "/" + networkTotalNodes }}
            </a-typography-link>
        </template>
    </a-modal>
</template>

<style scoped lang="stylus">
.runner-config
    margin-left 6px

.task-status
    padding-left 16px
.wallet-balance
    text-align right
    margin-top 6px
    .balance-link
        color #40a9ff
        text-decoration underline
        &:hover
            color #40a9ff
.network-stats
    color #40a9ff
    text-decoration underline
    &:hover
        color #40a9ff
        text-decoration underline
</style>
