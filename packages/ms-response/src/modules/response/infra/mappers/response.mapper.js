import { ResponseEntity } from "../../core/entities/response.entity.js";

export class ResponseMapper {
  /**
   * @typedef {Object} ResponsePersistenceModel
   * @property {string} [id]
   * @property {string} [participant_id]
   * @property {string} [participantId]
   * @property {string} [question_id]
   * @property {string} [questionId]
   * @property {string} [session_id]
   * @property {string} [sessionId]
   * @property {string|null} [choice_id]
   * @property {string|null} [choiceId]
   * @property {boolean|null} [is_correct]
   * @property {boolean|null} [isCorrect]
   * @property {Date} [submitted_at]
   * @property {Date} [submittedAt]
   */

  /**
   * @param {ResponsePersistenceModel} model
   * @returns {ResponseEntity | null}
   */
  static toDomain(model) {
    if (!model) {
      return null;
    }
    return new ResponseEntity({
      id: model.id || "",
      participantId: model.participant_id || model.participantId || "",
      questionId: model.question_id || model.questionId || "",
      sessionId: model.session_id || model.sessionId || "",
      choiceId:
        model.choice_id !== undefined
          ? model.choice_id
          : (model.choiceId ?? null),
      isCorrect:
        model.is_correct !== undefined
          ? model.is_correct
          : (model.isCorrect ?? null),
      submittedAt: model.submitted_at || model.submittedAt || new Date(),
    });
  }

  /**
   * @param {ResponseEntity} entity
   * @returns {Partial<import('../models/response.model.js').ResponseModel>}
   */
  static toPersistence(entity) {
    return {
      id: entity.id && entity.id !== "" ? entity.id : undefined,
      participant_id:
        entity.participantId && entity.participantId !== ""
          ? entity.participantId
          : undefined,
      question_id:
        entity.questionId && entity.questionId !== ""
          ? entity.questionId
          : undefined,
      session_id:
        entity.sessionId && entity.sessionId !== ""
          ? entity.sessionId
          : undefined,
      choice_id: entity.choiceId,
      is_correct: entity.isCorrect,
      submitted_at: entity.submittedAt,
    };
  }

  /**
   * @param {ResponseEntity} entity
   * @returns {import('common-contracts').Response}
   */
  static toDto(entity) {
    return {
      id: entity.id || "",
      participantId: entity.participantId,
      questionId: entity.questionId,
      sessionId: entity.sessionId,
      choiceId: entity.choiceId ?? null,
      isCorrect: entity.isCorrect ?? null,
      submittedAt: entity.submittedAt,
    };
  }
}
