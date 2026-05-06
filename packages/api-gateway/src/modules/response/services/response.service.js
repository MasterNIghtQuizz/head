import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

export class ResponseService extends BaseService {
  /**
   * @param {string} sessionId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<import("common-contracts").GetSessionResponsesResponse>}
   */
  async getAllSessionResponses(sessionId, headers) {
    return call({
      method: "GET",
      url: `${config.services.response}/responses/session/${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} participantId
   * @param {string} sessionId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<import("common-contracts").GetParticipantResponsesResponse>}
   */
  async getAllParticipantResponses(participantId, sessionId, headers) {
    return call({
      method: "GET",
      url: `${config.services.response}/responses/participant/${participantId}?sessionId=${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} questionId
   * @param {string} sessionId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<import("common-contracts").GetQuestionResponsesResponse>}
   */
  async getAllQuestionResponses(questionId, sessionId, headers) {
    return call({
      method: "GET",
      url: `${config.services.response}/responses/question/${questionId}?sessionId=${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {import("common-contracts").CreateResponseRequest} data
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<import("common-contracts").Response>}
   */
  async addResponse(data, headers) {
    return call({
      method: "POST",
      url: `${config.services.response}/responses/response`,
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} quizzId
   * @param {string} hostId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<import("common-contracts").Quizz>}
   */
  async startSession(quizzId, hostId, headers) {
    return call({
      method: "POST",
      url: `${config.services.response}/responses/session/start/${quizzId}?hostId=${hostId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} sessionId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<void>}
   */
  async endSession(sessionId, headers) {
    return call({
      method: "DELETE",
      url: `${config.services.response}/responses/session/end/${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
  /**
   * @param {string} sessionId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<{participantId: string, score: number}[]>}
   */
  async getLeaderboard(sessionId, headers) {
    return call({
      method: "GET",
      url: `${config.services.response}/responses/leaderboard/session/${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} questionId
   * @param {string} sessionId
   * @param {import("node:http").IncomingHttpHeaders} headers
   * @returns {Promise<{choiceId: string, count: number}[]>}
   */
  async getQuestionStats(questionId, sessionId, headers) {
    return call({
      method: "GET",
      url: `${config.services.response}/responses/stats/question/${questionId}?sessionId=${sessionId}`,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
}
