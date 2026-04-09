import { EntitySchema } from "typeorm";
import { SessionStatus } from "common-contracts";

export class SessionModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.public_key = undefined;
    /** @type {import("../mappers/session.mapper.js").SessionStatusType | undefined} */
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
