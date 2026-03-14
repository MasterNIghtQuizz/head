import { EntitySchema } from "typeorm";
export class QuestionModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.label = undefined;
    /** @type {string | undefined} */
    this.type = undefined;
    /** @type {number | undefined} */
    this.order_index = undefined;
    /** @type {number | undefined} */
    this.timer_seconds = undefined;
    /** @type {string | undefined} */
    this.quiz_id = undefined;
    /** @type {import('../models/choice.model.js').ChoiceModel[] | undefined} */
    this.choices = undefined;
  }
}

export const TypeOrmQuestionModel = new EntitySchema(
  /** @type {import('typeorm').EntitySchemaOptions<QuestionModel>} */ ({
    name: "QuestionModel",
    target: QuestionModel,
    tableName: "question",
    columns: {
      id: {
        primary: true,
        type: "uuid",
        generated: "uuid",
      },
      label: {
        type: "varchar",
      },
      type: {
        type: "varchar",
      },
      order_index: {
        type: "integer",
      },
      timer_seconds: {
        type: "integer",
      },
      quiz_id: {
        type: "uuid",
        nullable: true,
      },
    },
    relations: {
      quiz: {
        target: "QuizModel",
        type: "many-to-one",
        joinColumn: {
          name: "quiz_id",
        },
        inverseSide: "questions",
        onDelete: "CASCADE",
      },
      choices: {
        target: "ChoiceModel",
        type: "one-to-many",
        inverseSide: "question",
      },
    },
  }),
);
