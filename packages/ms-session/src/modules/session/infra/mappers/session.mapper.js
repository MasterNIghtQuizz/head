import { GetSessionResponseDto, ParticipantDto } from "../../contracts/session.dto.js";
import { SessionEntity } from "../../core/entities/session.entity.js";
import { SessionModel } from "../models/session.model.js";

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

  /**
   * @param {SessionEntity} entity
   * @param {ParticipantDto[]} participants
   * @return {GetSessionResponseDto} dto
   */
  static toDto(entity, participants = []) {
    const dto = new GetSessionResponseDto({
      session_id: entity.id,
      public_key: entity.publicKey,
      status: entity.status,
      current_question_id: entity.currentQuestionId,
      quizz_id: entity.quizzId,
      host_id: entity.hostId,
      participants: participants,
    });
    return dto;
  }
}
