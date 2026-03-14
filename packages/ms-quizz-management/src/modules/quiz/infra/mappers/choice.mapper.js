import { ChoiceEntity } from "../../core/entities/choice.entity.js";
import { ChoiceResponseDto } from "../../contracts/choice.dto.js";
import { ChoiceModel } from "../models/choice.model.js";

export class ChoiceMapper {
  /**
   * @param {ChoiceEntity} entity
   * @returns {import('../models/choice.model.js').ChoiceModel}
   */
  static toPersistence(entity) {
    const model = new ChoiceModel();
    model.id = entity.id;
    model.text = entity.text;
    model.is_correct = entity.is_correct;
    model.question_id = entity.questionId;
    return model;
  }

  /**
   * @param {import('../models/choice.model.js').ChoiceModel} model
   * @returns {ChoiceEntity}
   */
  static toDomain(model) {
    return new ChoiceEntity({
      id: model.id,
      text: model.text || "",
      is_correct: !!model.is_correct,
      questionId: model.question_id,
    });
  }

  /**
   * @param {ChoiceEntity} entity
   * @returns {ChoiceResponseDto}
   */
  static toDto(entity) {
    return new ChoiceResponseDto({
      id: entity.id || "",
      text: entity.text,
      is_correct: entity.is_correct,
    });
  }

  /**
   * @param {ChoiceEntity[]} entities
   * @returns {ChoiceResponseDto[]}
   */
  static toDtos(entities) {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * @param {import('../models/choice.model.js').ChoiceModel[]} models
   * @returns {ChoiceEntity[]}
   */
  static toDomains(models) {
    return models.map((model) => this.toDomain(model));
  }
}
