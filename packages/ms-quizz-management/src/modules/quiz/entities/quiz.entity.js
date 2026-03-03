import { EntitySchema } from "typeorm";

export const QuizEntity = new EntitySchema({
  name: "Quiz",
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
});
