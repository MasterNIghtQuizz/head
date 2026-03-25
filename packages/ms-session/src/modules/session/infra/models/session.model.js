import { EntitySchema } from "@common/database/src/index.js";
import { SessionStatus } from "../../core/entities/session-status.js";

export class SessionModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.public_key = undefined;
    /** @type {SessionStatus | undefined} */
    this.status = undefined;
    /** @type {string | undefined} */
    this.current_question_id = undefined;
    /** @type {string | undefined} */
    this.quizz_id = undefined;
    /** @type {string | undefined} */
    this.host_id = undefined;
  }
}

export const TypeOrmSessionModel = new EntitySchema({
  name: "SessionModel",
  target: SessionModel,
  tableName: "sessions",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    public_key: {
      type: "varchar",
      unique: true,
    },
    status: {
      type: "enum",
      enum: SessionStatus,
    },
    current_question_id: {
      type: "varchar",
      nullable: true,
    },
    quizz_id: {
      type: "varchar",
    },
    host_id: {
      type: "varchar",
    },
  },
});
