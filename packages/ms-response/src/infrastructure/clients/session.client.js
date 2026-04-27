import { call } from "common-axios";
import { config } from "../../config.js";

export class SessionClient {
  /**
   * @param {import('node:http').IncomingHttpHeaders} [headers]
   * @returns {Promise<import('common-contracts').GetSessionResponse>}
   */
  async getSession(headers) {
    return call({
      url: `${config.services.session.baseUrl}/sessions/`,
      method: "GET",
      headers,
    });
  }
}
