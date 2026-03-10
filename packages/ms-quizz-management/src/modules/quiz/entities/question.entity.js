import { EntitySchema } from "typeorm";
import { Question } from "../models/question.model.js";

/** @type {import('typeorm').EntitySchemaOptions<Question>} */
const questionSchema = {
  name: "Question",
  target: Question,
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
  },
  relations: {
    quiz: {
      target: "Quiz",
      type: "many-to-one",
      joinColumn: {
        name: "quiz_id",
      },
      inverseSide: "questions",
    },
    choices: {
      target: "Choice",
      type: "one-to-many",
      inverseSide: "question",
    },
  },
};

export const QuestionEntity = new EntitySchema(questionSchema);
