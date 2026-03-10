import { QuestionResponseDto } from "../contracts/question.dto.js";
import { Question } from "../models/question.model.js";

export class QuestionMapper {
  /**
   * @param {Object} raw
   * @returns {Question}
   */
  static toModel(raw) {
    return new Question(raw);
  }

  /**
   * @param {Question} model
   * @returns {QuestionResponseDto}
   */
  static toResponse(model) {
    return new QuestionResponseDto({
      id: model.id || "",
      label: model.label,
      type: model.type,
      order_index: model.order_index,
      timer_seconds: model.timer_seconds,
    });
  }
}
