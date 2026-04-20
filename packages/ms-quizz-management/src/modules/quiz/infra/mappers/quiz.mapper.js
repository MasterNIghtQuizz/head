import { QuizEntity } from "../../core/entities/quiz.entity.js";
import { QuizResponseDto } from "../../contracts/quiz.dto.js";
import { QuizModel } from "../models/quiz.model.js";
import { QuestionMapper } from "./question.mapper.js";

/**
 * @typedef {import('common-contracts').QuizResponse} QuizResponse
 * @typedef {import('common-contracts').FullQuizResponse} FullQuizResponse
 * @typedef {import('common-contracts').QuizIdsResponse} QuizIdsResponse
 */

export class QuizMapper {
  /**
   * @param {QuizEntity} entity
   * @returns {import('../models/quiz.model.js').QuizModel}
   */
  static toPersistence(entity) {
    const model = new QuizModel();
    model.id = entity.id;
    model.title = entity.title;
    model.description = entity.description;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }

  /**
   * @param {import('../models/quiz.model.js').QuizModel} model
   * @returns {QuizEntity}
   */
  static toDomain(model) {
    return new QuizEntity({
      id: model.id,
      title: model.title || "",
      description: model.description,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      questions: model.questions
        ? QuestionMapper.toDomains(model.questions)
        : [],
    });
  }

  /**
   * @param {QuizEntity} entity
   * @returns {QuizResponseDto}
   */
  static toDto(entity) {
    return new QuizResponseDto({
      id: entity.id || "",
      title: entity.title,
      description: entity.description,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : "",
      updatedAt: entity.updatedAt ? entity.updatedAt.toISOString() : "",
    });
  }

  /**
   * @param {QuizEntity[]} entities
   * @returns {QuizResponseDto[]}
   */
  static toDtos(entities) {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * @param {import('../models/quiz.model.js').QuizModel[]} models
   * @returns {QuizEntity[]}
   */
  static toDomains(models) {
    return models.map((model) => this.toDomain(model));
  }

  /**
   * @param {QuizEntity} entity
   * @returns {FullQuizResponse}
   */
  static toFullDto(entity) {
    return {
      id: entity.id || "",
      title: entity.title,
      description: entity.description,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : "",
      updatedAt: entity.updatedAt ? entity.updatedAt.toISOString() : "",
      questions: entity.questions.map((q) => ({
        id: q.id || "",
        label: q.label,
        type: q.type,
        order_index: q.order_index,
        timer_seconds: q.timer_seconds,
        choices: q.choices.map((c) => ({
          id: c.id || "",
          text: c.text,
          is_correct: c.is_correct,
        })),
      })),
    };
  }

  /**
   * @param {QuizEntity} entity
   * @returns {QuizIdsResponse}
   */
  static toIdsDto(entity) {
    return {
      quizId: entity.id || "",
      questions: entity.questions.map((q) => ({
        id: q.id || "",
        choices: q.choices.map((c) => ({
          id: c.id || "",
        })),
      })),
    };
  }
}
