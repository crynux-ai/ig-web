import BaseAPI from "../base-api";
import v1 from "./v1";

class NetworkAPI extends BaseAPI {
    getNodeStats() {
        return v1.get("/network/nodes");
    }
}

const networkAPI = new NetworkAPI();

export default networkAPI;
