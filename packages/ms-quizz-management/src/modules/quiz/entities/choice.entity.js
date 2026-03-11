import { EntitySchema } from "typeorm";
import { Choice } from "../models/choice.model.js";

/** @type {import('typeorm').EntitySchemaOptions<Choice>} */
const choiceSchema = {
  name: "Choice",
  target: Choice,
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
  },
  relations: {
    question: {
      target: "Question",
      type: "many-to-one",
      joinColumn: {
        name: "question_id",
      },
      inverseSide: "choices",
      onDelete: "CASCADE",
    },
  },
};

export const ChoiceEntity = new EntitySchema(choiceSchema);
