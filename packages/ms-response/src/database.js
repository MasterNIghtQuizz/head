import "reflect-metadata";
import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { CreateResponseTable } from "./migrations/1710000000000-CreateResponseTable.js";
import { TypeOrmResponseModel as ResponseEntity } from "./modules/response/infra/models/response.model.js";

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
      ResponseEntity,
      ProcessedEventEntity,
    ],
    migrations: [
      CreateResponseTable,
    ],
  });
};
