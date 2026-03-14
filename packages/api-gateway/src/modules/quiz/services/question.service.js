import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

/**
 * @typedef {import('common-contracts').QuestionResponse} QuestionResponse
 * @typedef {import('common-contracts').CreateQuestionRequest} CreateQuestionRequest
 * @typedef {import('common-contracts').UpdateQuestionRequest} UpdateQuestionRequest
 */

export class QuestionService extends BaseService {
  /**
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuestionResponse[]>}
   */
  async getAllQuestions(headers) {
    return call({
      url: `${config.services.quizz}/questions`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuestionResponse>}
   */
  async getQuestionById(id, headers) {
    return call({
      url: `${config.services.quizz}/questions/${id}`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} quizId
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuestionResponse[]>}
   */
  async getQuestionsByQuizId(quizId, headers) {
    return call({
      url: `${config.services.quizz}/questions/quiz/${quizId}`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {CreateQuestionRequest} data
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuestionResponse>}
   */
  async createQuestion(data, headers) {
    return call({
      url: `${config.services.quizz}/questions`,
      method: "POST",
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {UpdateQuestionRequest} data
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<QuestionResponse>}
   */
  async updateQuestion(id, data, headers) {
    return call({
      url: `${config.services.quizz}/questions/${id}`,
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
  async deleteQuestion(id, headers) {
    return call({
      url: `${config.services.quizz}/questions/${id}`,
      method: "DELETE",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
}
