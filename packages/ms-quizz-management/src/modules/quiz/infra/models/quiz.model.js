import { EntitySchema } from "typeorm";

export class QuizModel {
  constructor() {
    /** @type {string | undefined} */
    this.id = undefined;
    /** @type {string | undefined} */
    this.title = undefined;
    /** @type {string | undefined} */
    this.description = undefined;
    /** @type {Date | undefined} */
    this.createdAt = undefined;
    /** @type {Date | undefined} */
    this.updatedAt = undefined;
    /** @type {import('../models/question.model.js').QuestionModel[] | undefined} */
    this.questions = undefined;
  }
}

export const TypeOrmQuizModel = new EntitySchema(
  /** @type {import('typeorm').EntitySchemaOptions<QuizModel>} */ ({
    name: "QuizModel",
    target: QuizModel,
    tableName: "quizzes",
    columns: {
      id: {
        primary: true,
        type: "uuid",
        generated: "uuid",
      },
      title: {
        type: "varchar",
      },
      description: {
        type: "text",
        nullable: true,
      },
      createdAt: {
        type: "timestamp",
        createDate: true,
      },
      updatedAt: {
        type: "timestamp",
        updateDate: true,
      },
    },
    relations: {
      questions: {
        target: "QuestionModel",
        type: "one-to-many",
        inverseSide: "quiz",
      },
    },
  }),
);
