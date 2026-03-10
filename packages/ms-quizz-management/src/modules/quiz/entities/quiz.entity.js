import { EntitySchema } from "typeorm";
import { Quiz } from "../models/quiz.model.js";

/** @type {import('typeorm').EntitySchemaOptions<Quiz>} */
const quizSchema = {
  name: "Quiz",
  target: Quiz,
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
      target: "Question",
      type: "one-to-many",
      inverseSide: "quiz",
    },
  },
};

export const QuizEntity = new EntitySchema(quizSchema);
