import { EntitySchema } from "@common/database/src/index.js";

export class SessionModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.publicKey = undefined;
    /** @type {string | undefined} */
    this.status = undefined;
    /** @type {string | undefined} */
    this.currentQuestionId = undefined;
    /** @type {string | undefined} */
    this.quizzId = undefined;
    /** @type {string | undefined} */
    this.hostId = undefined;
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
    publicKey: {
      type: "varchar",
      unique: true,
    },
    status: {
      type: "varchar",
    },
    currentQuestionId: {
      type: "varchar",
      nullable: true,
    },
    quizzId: {
      type: "varchar",
    },
    hostId: {
      type: "varchar",
    },
  },
});
