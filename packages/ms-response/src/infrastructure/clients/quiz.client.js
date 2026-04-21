import { call } from "common-axios";
import { config } from "../../config.js";

export class QuizClient {
  /**
   * @param {string} quizId
   * @param {import('node:http').IncomingHttpHeaders} [headers]
   * @returns {Promise<import('common-contracts').Quizz>}
   */
  async getQuiz(quizId, headers) {
    return call({
      url: `${config.services.quizzManagement.baseUrl}/quizzes/get-full`,
      method: "POST",
      data: { quizId },
      headers,
    });
  }

  /**
   * @param {string} choiceId
   * @returns {Promise<import('common-contracts').Choice>}
   */
  async getChoice(choiceId) {
    return call({
      url: `${config.services.quizzManagement.baseUrl}/choices/${choiceId}`,
      method: "GET",
    });
  }
}
