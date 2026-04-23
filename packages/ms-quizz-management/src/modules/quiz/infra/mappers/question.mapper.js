import { QuestionEntity } from "../../core/entities/question.entity.js";
import { QuestionResponseDto } from "../../contracts/question.dto.js";
import { QuestionModel } from "../models/question.model.js";
import { ChoiceMapper } from "./choice.mapper.js";

export class QuestionMapper {
  /**
   * @param {QuestionEntity} entity
   * @returns {QuestionModel}
   */
  static toPersistence(entity) {
    const model = new QuestionModel();
    model.id = entity.id;
    model.label = entity.label;
    model.type = entity.type;
    model.order_index = entity.order_index;
    model.timer_seconds = entity.timer_seconds;
    model.quiz_id = entity.quizId;
    return model;
  }

  /**
   * @param {import('../models/question.model.js').QuestionModel} model
   * @returns {QuestionEntity}
   */
  static toDomain(model) {
    return new QuestionEntity({
      id: model.id,
      label: model.label || "",
      type: model.type || "",
      order_index: model.order_index || 0,
      timer_seconds: model.timer_seconds || 0,
      quizId: model.quiz_id,
      choices: model.choices ? ChoiceMapper.toDomains(model.choices) : [],
    });
  }

  /**
   * @param {QuestionEntity} entity
   * @returns {QuestionResponseDto}
   */
  static toDto(entity) {
    return new QuestionResponseDto({
      id: entity.id || "",
      label: entity.label,
      type: entity.type,
      order_index: entity.order_index,
      timer_seconds: entity.timer_seconds,
      choices: entity.choices ? ChoiceMapper.toDtos(entity.choices) : [],
    });
  }

  /**
   * @param {QuestionEntity[]} entities
   * @returns {QuestionResponseDto[]}
   */
  static toDtos(entities) {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * @param {import('../models/question.model.js').QuestionModel[]} models
   * @returns {QuestionEntity[]}
   */
  static toDomains(models) {
    return models.map((model) => this.toDomain(model));
  }
}
