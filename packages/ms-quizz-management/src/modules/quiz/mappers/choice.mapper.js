import { ChoiceResponseDto } from "../contracts/choice.dto.js";
import { Choice } from "../models/choice.model.js";

export class ChoiceMapper {
  /**
   * @param {Object} raw
   * @returns {Choice}
   */
  static toModel(raw) {
    return new Choice(raw);
  }

  /**
   * @param {Choice} model
   * @returns {ChoiceResponseDto}
   */
  static toResponse(model) {
    return new ChoiceResponseDto({
      id: model.id || "",
      text: model.text,
      is_correct: model.is_correct,
    });
  }
}
