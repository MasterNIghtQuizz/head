import "reflect-metadata";
import logger from "./logger.js";
import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { CreateResponseTable1710000000000 as CreateResponseTable } from "./migrations/1710000000000-CreateResponseTable.js";
import { CreateProcessedEventsTable1710000000001 as CreateProcessedEventsTable } from "./migrations/1710000000001-CreateProcessedEventsTable.js";
import { TypeOrmResponseModel as ResponseEntity } from "./modules/response/infra/models/response.model.js";
const strategy = new TypeORMStrategy();
export const db = new DatabaseContext(strategy);

export const initDatabase = async () => {
  try {
    await db.connect({
      host: config.postgres.host,
      port: config.postgres.port,
      user: config.postgres.user,
      password: config.postgres.password,
      database: config.postgres.database,
      env: config.env,
      entities: [ResponseEntity, ProcessedEventEntity],
      migrations: [CreateResponseTable, CreateProcessedEventsTable],
    });
  } catch (err) {
    logger.error(
      { err },
      "Database connection failed. Service will start in degraded mode.",
    );
  }
};
