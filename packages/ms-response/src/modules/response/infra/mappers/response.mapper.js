import { ResponseEntity } from "../../core/entities/response.entity.js";

export class ResponseMapper {
  static toDomain(model) {
    return new ResponseEntity({
      id: model.id,
      participantId: model.participant_id,
      questionId: model.question_id,
      sessionId: model.session_id,
      choiceId: model.choice_id,
      isCorrect: model.is_correct,
      submittedAt: model.submitted_at,
    });
  }

  static toPersistence(entity) {
    return {
      id: entity.id,
      participant_id: entity.participantId,
      question_id: entity.questionId,
      session_id: entity.sessionId,
      choice_id: entity.choiceId,
      is_correct: entity.isCorrect,
      submitted_at: entity.submittedAt,
    };
  }
}
