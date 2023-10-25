import BaseAPI from "../base-api";
import v1 from "./v1";

class ModelAPI extends BaseAPI {
    getBaseModels() {
        return v1.get("/models/base");
    }

    getLoraModels(modelType) {

        let url = "/models/lora";

        if(modelType) {
            url += "?type=" + modelType
        }

        return v1.get(url);
    }
}

const modelAPI = new ModelAPI();

export default modelAPI;
