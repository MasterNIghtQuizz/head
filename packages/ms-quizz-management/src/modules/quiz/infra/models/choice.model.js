import { EntitySchema } from "typeorm";

export class ChoiceModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.text = undefined;
    /** @type {boolean | undefined} */
    this.is_correct = undefined;
    /** @type {string | undefined} */
    this.question_id = undefined;
  }
}

export const TypeOrmChoiceModel = new EntitySchema(
  /** @type {import('typeorm').EntitySchemaOptions<ChoiceModel>} */ ({
    name: "ChoiceModel",
    target: ChoiceModel,
    tableName: "choice",
    columns: {
      id: {
        primary: true,
        type: "uuid",
        generated: "uuid",
      },
      text: {
        type: "varchar",
      },
      is_correct: {
        type: "boolean",
      },
      question_id: {
        type: "uuid",
        nullable: true,
      },
    },
    relations: {
      question: {
        target: "QuestionModel",
        type: "many-to-one",
        joinColumn: {
          name: "question_id",
        },
        inverseSide: "choices",
        onDelete: "CASCADE",
      },
    },
  }),
);
