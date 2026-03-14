import "reflect-metadata";
import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { QuizEntity } from "./modules/quiz/entities/quiz.entity.js";
import { QuestionEntity } from "./modules/quiz/entities/question.entity.js";
import { ChoiceEntity } from "./modules/quiz/entities/choice.entity.js";
import { CreateProcessedEventsTable1710000000000 } from "./migrations/1710000000000-CreateProcessedEventsTable.js";
import { CreateQuizTables1710000000001 } from "./migrations/1710000000001-CreateQuizTables.js";

const strategy = new TypeORMStrategy();
export const db = new DatabaseContext(strategy);

export const initDatabase = async () => {
  await db.connect({
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
    env: config.env,
    entities: [QuizEntity, QuestionEntity, ChoiceEntity, ProcessedEventEntity],
    migrations: [
      CreateProcessedEventsTable1710000000000,
      CreateQuizTables1710000000001,
    ],
  });
};
