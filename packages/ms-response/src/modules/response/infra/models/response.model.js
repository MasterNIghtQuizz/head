import { EntitySchema } from "typeorm";

export class ResponseModel {}

export const TypeOrmResponseModel = new EntitySchema({
  name: "ResponseModel",
  target: ResponseModel,
  tableName: "response",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    participant_id: {
      type: "uuid",
    },
    question_id: {
      type: "uuid",
    },
    session_id: {
      type: "uuid",
    },
    choice_id: {
      type: "uuid",
      nullable: true,
    },
    is_correct: {
      type: "boolean",
      nullable: true,
    },
    submitted_at: {
      type: "timestamp",
      createDate: true,
    },
  },
});
