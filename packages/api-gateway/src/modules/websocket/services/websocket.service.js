import { BaseService } from "common-core";
import { config } from "../../../config.js";

export class WebSocketService extends BaseService {
  /**
   * @param {string} userId
   * @returns {Promise<import('common-contracts').WebSocketConnectResponse>}
   */
  async connect(userId) {
    const wsUrl = config.services.websocket
      .replace(/^http:\/\//i, "ws://")
      .replace(/^https:\/\//i, "wss://");

    return {
      wsUrl,
      userId,
    };
  }
}
