import {defineStore} from 'pinia'
import {BaseModelType} from "@/models/base_model";
import {computed, ref, watch} from "vue";
import inferenceAPI from "@/api/v1/inference";

const controlnetModels = {};
controlnetModels[BaseModelType.SD15] = 'lllyasviel/control_v11p_sd15_openpose';
controlnetModels[BaseModelType.SDXL] = 'thibaud/controlnet-openpose-sdxl-1.0'

const defaultBaseModel = {
    name: 'crynux-ai/sdxl-turbo',
    type: BaseModelType.SDXL_TURBO
};

export const useTaskStore = defineStore('task', () => {
    const inference_task = ref({
        task_id: '',
        pose: {
            category: '',
            index: -1
        },
        custom_civitai_id: '',
        base_model_type: defaultBaseModel.type,
        task_args: {
            base_model: defaultBaseModel.name,
            prompt: '',
            negative_prompt: '',
            lora: {
                model: '',
                weight: 0.8
            },
            controlnet: {
                model: controlnetModels[defaultBaseModel.type],
                weight: 0.8,
                image_dataurl: ''
            },
            task_config: {
                image_width: 512,
                image_height: 512,
                steps: 1,
                num_images: 1,
                seed: 0,
                safety_checker: false,
                cfg: 0,
            }
        }
    })

    const clearInferenceTask = () => {
        inference_task.value.task_id = "";
    };

    const changeBaseModel = (modelName, modelType) => {
        inference_task.value.task_args.base_model = modelName;
            if (inference_task.value.base_model_type !== modelType) {
                inference_task.value.base_model_type = modelType;

                // Model type changed
                // LoRA model must be reset
                inference_task.value.task_args.lora.model = '';
                inference_task.value.custom_civitai_id = '';

                if (inference_task.value.base_model_type === BaseModelType.SDXL_TURBO) {
                    inference_task.value.task_args.task_config.steps = 1;
                    inference_task.value.task_args.task_config.cfg = 0;
                } else if (inference_task.value.base_model_type === BaseModelType.SD15) {
                    inference_task.value.task_args.task_config.steps = 40;
                    inference_task.value.task_args.task_config.cfg = 5;
                }
            }
    };

    watch( () => inference_task.value.custom_civitai_id, (newValue) => {
        if (newValue !== '') {
            inference_task.value.task_args.lora.model = '';
        }
    });

    const taskArgsJson = computed(async () => {
        const taskArgs = JSON.parse(JSON.stringify(inference_task.value.task_args));

        // Lora settings
        if (taskArgs.lora.model === "" && inference_task.value.custom_civitai_id === "") {
            taskArgs.lora = null;
        } else {
            if(inference_task.value.custom_civitai_id !== "") {
                taskArgs.lora.model = "https://civitai.com/api/download/models/" + inference_task.value.custom_civitai_id;
            }

            taskArgs.lora.weight = Math.round(taskArgs.lora.weight * 100)
        }

        // Controlnet settings
        const pose = inference_task.value.pose;
        if (pose.category !== "" && pose.index !== -1) {
            const poseImageUrl = "/poses/" + pose.category + "/"
            + pose.category + "_" + String(pose.index).padStart(2, '0') + '.png';

            taskArgs.controlnet.image_dataurl = await inferenceAPI.getImageAsDataURL(poseImageUrl);
            taskArgs.controlnet.weight = Math.round(taskArgs.controlnet.weight * 100);
            taskArgs.controlnet.model = controlnetModels[inference_task.value.base_model_type];
        } else {
            taskArgs.controlnet = null;
        }
        // sdxl-turbo specified task args
        if (taskArgs.base_model.includes("sdxl-turbo")) {
            taskArgs.task_config.cfg = 0;
            if (taskArgs.task_config.steps > 4) {
                taskArgs.task_config.steps = 4;
            }
            taskArgs.scheduler = {
                method: "EulerAncestralDiscreteScheduler",
                args: {
                    timestep_spacing: "trailing"
                }
            }
        }

        const taskArgsJsonStr = JSON.stringify(taskArgs);

        console.log(taskArgsJsonStr);

        return taskArgsJsonStr;
    });

    return { inference_task, clearInferenceTask, changeBaseModel, taskArgsJson }
});
