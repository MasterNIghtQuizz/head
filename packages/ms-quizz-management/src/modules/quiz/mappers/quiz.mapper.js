import { QuizResponseDto } from "../contracts/quiz.dto.js";
import { Quiz } from "../models/quiz.model.js";

export class QuizMapper {
  /**
   * @param {Object} raw
   * @returns {Quiz}
   */
  static toModel(raw) {
    return new Quiz(raw);
  }

  /**
   * @param {Quiz} model
   * @returns {QuizResponseDto}
   */
  static toResponse(model) {
    return new QuizResponseDto({
      id: model.id || "",
      title: model.title,
      description: model.description,
      createdAt: model.createdAt ? model.createdAt.toISOString() : "",
      updatedAt: model.updatedAt ? model.updatedAt.toISOString() : "",
    });
  }
}
