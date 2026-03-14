import "reflect-metadata";
import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { TypeOrmQuizModel as QuizEntity } from "./modules/quiz/infra/models/quiz.model.js";
import { TypeOrmQuestionModel as QuestionEntity } from "./modules/quiz/infra/models/question.model.js";
import { TypeOrmChoiceModel as ChoiceEntity } from "./modules/quiz/infra/models/choice.model.js";
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
