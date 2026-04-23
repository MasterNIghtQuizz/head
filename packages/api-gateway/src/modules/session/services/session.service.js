import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

/** @typedef {import("common-contracts").CreateSessionResponse} CreateSessionResponse */
/** @typedef {import("common-contracts").CreateSessionRequest} CreateSessionRequest */
/** @typedef {import("common-contracts").GetSessionResponse} GetSessionResponse */
/** @typedef {import("common-contracts").GetCurrentQuestionResponse} GetCurrentQuestionResponse */
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
      url: `${config.services.session}/sessions/`,
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<GetSessionResponse>}
   */
  async getSession(headers) {
    return call({
      method: "GET",
      url: `${config.services.session}/sessions/`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async startSession(headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/start/`,
      data: {},
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async endSession(headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/end/`,
      data: {},
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async deleteSession(headers) {
    await call({
      method: "DELETE",
      url: `${config.services.session}/sessions/`,
      data: {},
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async nextQuestion(headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/next/`,
      data: {},
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
      url: `${config.services.session}/sessions/join/`,
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async leaveSession(headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/leave/`,
      data: {},
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<GetCurrentQuestionResponse>}
   */
  async getCurrentQuestion(headers) {
    return call({
      method: "GET",
      url: `${config.services.session}/sessions/current-question/`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string[]} choiceIds
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async submitResponse(choiceIds, headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/submit/`,
      data: { choiceIds },
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} participantId
   * @param {boolean} isCorrect
   * @param {import("http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async answerBuzzer(participantId, isCorrect, headers) {
    await call({
      method: "POST",
      url: `${config.services.session}/sessions/buzzer/answer/`,
      data: { participantId, isCorrect },
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
}
