import { GetSessionResponseDto } from "../../contracts/session.dto.js";

/**
 * @typedef {import('../../contracts/session.dto.js').ParticipantDto} ParticipantDto
 */
import { SessionEntity } from "../../core/entities/session.entity.js";
import { SessionModel } from "../models/session.model.js";

/**
 * @typedef {import('common-contracts').ParticipantRolesType} ParticipantRolesType
 */

/**
 * @typedef {import('common-contracts').SessionStatusType} SessionStatusType
 */

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
   * @param {import("common-contracts").FullQuestionResponse | null} currentQuestion
   * @param {number | null} [activatedAt=null]
   * @param {boolean} [hasAnswered=false]
   * @return {GetSessionResponseDto} dto
   */
  static toDto(
    entity,
    participants = [],
    currentQuestion = null,
    activatedAt = null,
    hasAnswered = false,
  ) {
    const dto = new GetSessionResponseDto({
      session_id: entity.id,
      public_key: entity.publicKey,
      status: entity.status,
      current_question_id: entity.currentQuestionId,
      current_question: currentQuestion,
      quizz_id: entity.quizzId,
      host_id: entity.hostId,
      participants: participants,
      activated_at: activatedAt,
      has_answered: hasAnswered,
    });
    return dto;
  }
}
