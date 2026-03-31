import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

/** @typedef {import("common-contracts").CreateSessionResponse} CreateSessionResponse */
/** @typedef {import("common-contracts").CreateSessionRequest} CreateSessionRequest */
/** @typedef {import("common-contracts").GetSessionResponse} GetSessionResponse */
/** @typedef {import("common-contracts").JoinSessionRequest} JoinSessionRequest */
/** @typedef {import("common-contracts").JoinSessionResponse} JoinSessionResponse */
/** @typedef {import("common-contracts").LeaveSessionRequest} LeaveSessionRequest */

export class SessionService extends BaseService {
  /**
   * @param {CreateSessionRequest} data
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<CreateSessionResponse>}
   */
  async createSession(data, headers) {
    return call({
      method: "POST",
      url: `${config.services.session}/sessions`,
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<GetSessionResponse>}
   */
  async getSession(sessionId, headers) {
    return call({
      method: "GET",
      url: `${config.services.session}/sessions/${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async startSession(sessionId, headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/${sessionId}/start`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async endSession(sessionId, headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/${sessionId}/end`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId, headers) {
    await call({
      method: "DELETE",
      url: `${config.services.session}/sessions/${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} sessionId
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async nextQuestion(sessionId, headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/${sessionId}/next`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {JoinSessionRequest} data
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<JoinSessionResponse>}
   */
  async joinSession(data, headers) {
    return call({
      method: "POST",
      url: `${config.services.session}/sessions/join`,
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {LeaveSessionRequest} data
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async leaveSession(data, headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/leave`,
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
}
