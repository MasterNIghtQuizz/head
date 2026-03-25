import { SessionEntity } from "../../core/entities/session.entity.js";
import { SessionModel } from "../models/session.model.js";
import { SessionStatus } from "../../core/entities/session-status.js";

export class SessionMapper {
  /**
   * @param {SessionEntity} entity
   * @return {SessionModel} model
   */
  static toModel(entity) {
    const model = new SessionModel();
    model.id = entity.id;
    model.public_key = entity.publicKey;
    model.host_id = entity.hostId ?? undefined;
    model.status = entity.status ?? undefined;
    model.current_question_id = entity.currentQuestionId ?? undefined;
    model.quizz_id = entity.quizzId ?? undefined;
    return model;
  }

  /**
   * @param {SessionModel} model
   * @return {SessionEntity} entity
   */
  static toEntity(model) {
    const entity = new SessionEntity({
      id: model.id ?? null,
      publicKey: model.public_key ?? null,
      status: model.status ?? null,
      currentQuestionId: model.current_question_id ?? null,
      quizzId: model.quizz_id ?? null,
      hostId: model.host_id ?? null,
    });
    return entity;
  }
}
