import { ResponseEntity } from "../../core/entities/response.entity.js";

export class ResponseMapper {
  /**
   * @param {Required<import('../models/response.model.js').ResponseModel>} model
   * @returns {ResponseEntity}
   */
  static toDomain(model) {
    // C'est normal les TS ignore ici car les champs sont optionnels dans le modèle
    // mais ils sont requis dans l'entité
    return new ResponseEntity({
      id: model.id,
      // @ts-ignore
      participantId: model.participant_id,
      // @ts-ignore
      questionId: model.question_id,
      // @ts-ignore
      sessionId: model.session_id,
      choiceId: model.choice_id,
      isCorrect: model.is_correct,
      submittedAt: model.submitted_at,
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
}
