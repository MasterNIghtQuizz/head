import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

/**
 * @typedef {import('common-contracts').QuizResponse} QuizResponse
 * @typedef {import('common-contracts').CreateQuizRequest} CreateQuizRequest
 * @typedef {import('common-contracts').UpdateQuizRequest} UpdateQuizRequest
 */

export class QuizService extends BaseService {
  /**
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuizResponse[]>}
   */
  async getAllQuizzes(headers) {
    return call({
      url: `${config.services.quizz}/quizzes`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuizResponse>}
   */
  async getQuizById(id, headers) {
    return call({
      url: `${config.services.quizz}/quizzes/${id}`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {CreateQuizRequest} data
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuizResponse>}
   */
  async createQuiz(data, headers) {
    return call({
      url: `${config.services.quizz}/quizzes`,
      method: "POST",
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {UpdateQuizRequest} data
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuizResponse>}
   */
  async updateQuiz(id, data, headers) {
    return call({
      url: `${config.services.quizz}/quizzes/${id}`,
      method: "PUT",
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<void>}
   */
  async deleteQuiz(id, headers) {
    return call({
      url: `${config.services.quizz}/quizzes/${id}`,
      method: "DELETE",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
}
