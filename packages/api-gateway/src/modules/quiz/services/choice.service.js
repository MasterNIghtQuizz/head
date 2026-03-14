import { BaseService } from "common-core";
import { call } from "common-axios";
import { config } from "../../../config.js";

/**
 * @typedef {import('common-contracts').ChoiceResponse} ChoiceResponse
 * @typedef {import('common-contracts').CreateChoiceRequest} CreateChoiceRequest
 * @typedef {import('common-contracts').UpdateChoiceRequest} UpdateChoiceRequest
 */

export class ChoiceService extends BaseService {
  /**
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<ChoiceResponse[]>}
   */
  async getAllChoices(headers) {
    return call({
      url: `${config.services.quizz}/choices`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<ChoiceResponse>}
   */
  async getChoiceById(id, headers) {
    return call({
      url: `${config.services.quizz}/choices/${id}`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} questionId
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<ChoiceResponse[]>}
   */
  async getChoicesByQuestionId(questionId, headers) {
    return call({
      url: `${config.services.quizz}/choices/question/${questionId}`,
      method: "GET",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {CreateChoiceRequest} data
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<ChoiceResponse>}
   */
  async createChoice(data, headers) {
    return call({
      url: `${config.services.quizz}/choices`,
      method: "POST",
      data,
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }

  /**
   * @param {string} id
   * @param {UpdateChoiceRequest} data
   * @param {import('http').IncomingHttpHeaders} [headers]
   * @returns {Promise<ChoiceResponse>}
   */
  async updateChoice(id, data, headers) {
    return call({
      url: `${config.services.quizz}/choices/${id}`,
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
  async deleteChoice(id, headers) {
    return call({
      url: `${config.services.quizz}/choices/${id}`,
      method: "DELETE",
      headers: /** @type {Record<string, string>} */ (headers),
    });
  }
}
