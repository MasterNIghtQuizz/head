import { call } from "common-axios";
import { config } from "../../config.js";

export class SessionClient {
  /**
   * @param {string} sessionId
   * @param {import('node:http').IncomingHttpHeaders} [headers]
   * @returns {Promise<import('common-contracts').Quizz>}
   */
  async getSession(sessionId, headers) {
    return call({
      url: `${config.services.session.baseUrl}/quizzes/get-full`,
      method: "GET",
      data: { sessionId },
      headers,
    });
  }
}
