import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

export class UserService extends BaseService {
  /**
   * Ping MS User
   * @param {string} internalToken
   * @returns {Promise<import('common-contracts').HealthCheckResponseDto>}
   */
  async pingMsUser(internalToken) {
    return call({
      url: `${config.services.user}/users/health-check`,
      method: "GET",
      headers: {
        "internal-token": internalToken,
      },
    });
  }
}
