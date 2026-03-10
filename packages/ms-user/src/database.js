import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { UserEntity } from "./modules/user/entities/user.entity.js";
import { CreateProcessedEventsTable1710000000000 } from "./migrations/1710000000000-CreateProcessedEventsTable.js";

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
    entities: [UserEntity, ProcessedEventEntity],
    migrations: [CreateProcessedEventsTable1710000000000],
  });
};
