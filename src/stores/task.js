import { defineStore } from 'pinia'

export const useTaskStore = defineStore('task', {
    state: () => ({
        inference_task: {
            task_id: '',
            task_args: {
                base_model: 'runwayml/stable-diffusion-v1-5',
                prompt: '',
                negative_prompt: '',
                lora: {
                    model: '',
                    weight: 80,
                    weight_d100: 0.8
                },
                controlnet: {
                    model: 'lllyasviel/control_v11p_sd15_openpose',
                    weight: 80,
                    weight_d100: 0.8,
                    image_dataurl: ''
                },
                task_config: {
                    image_width: 768,
                    image_height: 1024,
                    steps: 40,
                    num_images: 6,
                    seed: 0,
                    safety_checker: false,
                    cfg: 5,
                }
            }
        },
    }),
    actions: {
        clearInferenceTask(){
            this.inference_task.task_id = "";
        }
    }
});
