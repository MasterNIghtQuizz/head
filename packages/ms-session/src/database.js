import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { CreateSessionsAndParticipantsTables1680960000000 } from "./migrations/1680960000000-CreateSessionsAndParticipantsTables.js";
import { TypeOrmSessionModel } from "./modules/session/infra/models/session.model.js";
import { TypeOrmParticipantModel } from "./modules/session/infra/models/participant.model.js";

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
    entities: [
      TypeOrmSessionModel,
      TypeOrmParticipantModel,
      ProcessedEventEntity,
    ],
    migrations: [CreateSessionsAndParticipantsTables1680960000000],
  });
};
