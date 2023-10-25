<script setup>
import { SettingFilled, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons-vue'
import { createV1Client } from '@/api/v1/v1';
import nodeAPI from "../../api/v1/node";

import {reactive, ref, watch} from "vue";
import {useNodeStore} from "@/stores/node";

let modalVisible = ref(false)
const openModal = () => {
    nodeCheckResult.value = -1;
    modalVisible.value = true
};
const closeModal = () => {
    modalVisible.value = false
};

const nodeStore = useNodeStore();

watch(() => nodeStore.node_host + nodeStore.node_port, () => {
    nodeStore.clearNodeInfo();

    if(nodeStore.isNodeFilled) {
        createV1Client(nodeStore.nodeUrl);
    }
});

const settingsActiveKey = ref("node");
const nodeCheckResult=ref(-1);

const testNodeConnection = async () => {

    try {
        const result = await nodeAPI.getNodeInfo();

        if(result.node_type === 'crynux_node') {
            nodeCheckResult.value = 1;

            nodeStore.node_info.node_type = result.node_type
            nodeStore.node_info.node_name = result.node_name
            nodeStore.node_info.node_capabilities = result.node_capabilities
            nodeStore.node_info.node_version = result.node_version

        } else {
            nodeCheckResult.value = 0;
        }

    } catch (e) {
        nodeCheckResult.value = 0;
    }
};
</script>

<template>
    <div>
        <a-button type="default" size="large" @click="openModal">
            <template #icon>
                <setting-filled />
            </template>
        </a-button>
        <a-modal
            :visible="modalVisible"
            title="Settings"
            :footer="null"
            @ok="closeModal"
            @cancel="closeModal"
            width="800px"
            :mask-closable="false"
        >
            <a-tabs
            v-model:activeKey="settingsActiveKey"
            tab-position="left"
            >
                <a-tab-pane key="node" tab="Hardware">
                    <a-alert class="no-node-alert" v-if="!nodeStore.isNodeTested" message="A Crynux node must be provided to actually run the training and image generation tasks." type="error" />
                    <a-input-group size="large">
                      <a-row :gutter="12">
                        <a-col :span="6">
                          <a-input v-model:value="nodeStore.node_host" placeholder="http://127.0.0.1"/>
                        </a-col>
                        <a-col :span="3">
                          <a-input v-model:value="nodeStore.node_port" placeholder="5025"/>
                        </a-col>
                          <a-col :span="8">
                              <a-button size="large" @click="testNodeConnection" :disabled="!nodeStore.isNodeFilled">Test</a-button>
                              <span :class="{'node-check-result': true, 'success': nodeCheckResult===1, 'fail': nodeCheckResult===0}">
                                  <check-circle-filled v-if="nodeCheckResult===1"></check-circle-filled>
                                  <close-circle-filled v-if="nodeCheckResult===0"></close-circle-filled>
                              </span>
                          </a-col>
                      </a-row>
                    </a-input-group>
                    <div class="node-info">
                        <a-descriptions bordered size="small" :column="1">
                            <a-descriptions-item label="Node name" :label-style="{width: '180px'}">{{ nodeStore.node_info.node_name }}</a-descriptions-item>
                        <a-descriptions-item label="Node type">{{ nodeStore.node_info.node_type }}</a-descriptions-item>
                        <a-descriptions-item label="Capabilities">{{ nodeStore.node_info.node_capabilities }}</a-descriptions-item>
                            <a-descriptions-item label="Node version">{{ nodeStore.node_info.node_version }}</a-descriptions-item>
                        </a-descriptions>
                    </div>
                    <a-typography-paragraph class="find-node">
                        <a-typography-text>Before the Crynux mainnet release, please find the node providers who have the spared computing resources available in the <a-typography-link> community</a-typography-link>, or <a-typography-link href="https://github.com/crynux-ai/lora-runner" target="_blank">run a node yourself</a-typography-link>.</a-typography-text>
                    </a-typography-paragraph>
                </a-tab-pane>
                <a-tab-pane key="profile" tab="Profile">Profile</a-tab-pane>
                <a-tab-pane key="advanced" tab="Advanced">Advanced</a-tab-pane>
            </a-tabs>
        </a-modal>
    </div>
</template>

<style scoped lang="stylus">
.node-check-result
    margin-left 16px
    display none

    &.success
        display inline
        color green
    &.fail
        display inline
        color red
.node-info
    margin-top 24px
.find-node
    margin-top 24px
.no-node-alert
    margin-bottom 24px
</style>
