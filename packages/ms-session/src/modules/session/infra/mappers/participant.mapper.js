import { ParticipantRoles } from "../../core/entities/participant-roles.js";
import { ParticipantEntity } from "../../core/entities/participant.entity.js";
import { ParticipantModel } from "../models/participant.model.js";

export class ParticipantMapper {
  /**
   * @param {ParticipantEntity} entity
   * @return {ParticipantModel} model
   */
  static toModel(entity) {
    const model = new ParticipantModel();
    model.id = entity.id;
    model.role = entity.role;
    model.session_id = entity.sessionId;
    model.nickname = entity.nickname;
    model.socket_id = entity.socketId;
    return model;
  }

  /**
   * @param {ParticipantModel} model
   * @return {ParticipantEntity} entity
   */
  static toEntity(model) {
    const entity = new ParticipantEntity({
      id: model.id ?? null,
      role: model.role ?? ParticipantRoles.PLAYER,
      sessionId: model.session_id ?? "",
      nickname: model.nickname ?? "",
      socketId: model.socket_id ?? "",
    });
    return entity;
  }
}
