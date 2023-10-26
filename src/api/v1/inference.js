import BaseAPI from "../base-api";
import v1 from "./v1";

class InferenceAPI extends BaseAPI {

    createTask(clientId, taskArgs) {
        return v1.post("/inference_tasks", {
            'client_id': clientId,
            'task_args': JSON.stringify(taskArgs)
        });
    }

    getTaskStatus(clientId, taskId) {
        return v1.get("/inference_tasks/" + clientId + "/" + taskId);
    }

    getImage(clientId, taskId, imageNum) {

        const imageUrl = v1.getV1BaseURL() + "/inference_tasks/" + clientId + "/" + taskId + "/images/" + imageNum;
        return this.getImageAsDataURL(imageUrl)
    }

    async getImageAsDataURL(imageUrl) {
        const res = await fetch(imageUrl);
        const dataBlob = await res.blob();
        return this.readBlob(dataBlob);
    }

    readBlob(b) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onloadend = function() {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(b);
        });
    }
}

const inferenceAPI = new InferenceAPI();

export default inferenceAPI;
