import { EntitySchema } from "typeorm";
import { ParticipantRoles } from "../../core/entities/participant-roles.js";

export class ParticipantModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {import("../mappers/session.mapper.js").ParticipantRolesType | undefined} */
    this.role = undefined;
    /** @type {string | undefined} */
    this.session_id = undefined;
    /** @type {string | undefined} */
    this.nickname = undefined;
    /** @type {string | undefined} */
    this.socket_id = undefined;
  }
}

export const TypeOrmParticipantModel = new EntitySchema({
  name: "ParticipantModel",
  target: ParticipantModel,
  tableName: "participants",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    role: {
      type: "enum",
      enum: ParticipantRoles,
    },
    session_id: {
      type: "varchar",
    },
    nickname: {
      type: "varchar",
    },
    socket_id: {
      type: "varchar",
    },
  },
});
