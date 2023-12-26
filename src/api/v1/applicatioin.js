import BaseAPI from "../base-api";
import v1 from "./v1";

class ApplicationAPI extends BaseAPI {
    getWalletBalance() {
        return v1.get("/application/wallet/balance");
    }
}

const applicationAPI = new ApplicationAPI();

export default applicationAPI;
