import { EntitySchema } from "typeorm";

export class ResponseModel {
  /** @type {string | undefined} */
  id = undefined;

  /** @type {string | undefined} */
  participant_id = undefined;

  /** @type {string | undefined} */
  question_id = undefined;

  /** @type {string | undefined} */
  session_id = undefined;

  /** @type {string | null} */
  choice_id = null;

  /** @type {boolean | null} */
  is_correct = null;

  /** @type {Date} */
  submitted_at = new Date();
}

/** @type {import('typeorm').EntitySchema<ResponseModel>} */
export const TypeOrmResponseModel = new EntitySchema(
  /** @type {import('typeorm').EntitySchemaOptions<ResponseModel>} */ ({
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
  }),
);
