import {defineStore} from 'pinia'
import {BaseModelType} from "@/models/base_model";
import {computed, ref, watch} from "vue";
import inferenceAPI from "@/api/v1/inference";

const controlnetModels = {};
controlnetModels[BaseModelType.SD15] = 'lllyasviel/control_v11p_sd15_openpose';
controlnetModels[BaseModelType.SDXL] = 'thibaud/controlnet-openpose-sdxl-1.0'

const defaultBaseModel = {
    name: 'runwayml/stable-diffusion-v1-5',
    type: BaseModelType.SD15
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
                steps: 40,
                num_images: 1,
                seed: 0,
                safety_checker: false,
                cfg: 5,
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

        taskArgs.task_config.seed = Math.round(Math.random() * 100000000)

        const taskArgsJsonStr = JSON.stringify(taskArgs);

        console.log(taskArgsJsonStr);

        return taskArgsJsonStr;
    });

    return { inference_task, clearInferenceTask, changeBaseModel, taskArgsJson }
});
