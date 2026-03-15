import "reflect-metadata";
import logger from "common-logger";
import {
  DatabaseContext,
  TypeORMStrategy,
  ProcessedEventEntity,
} from "common-database";
import { config } from "./config.js";
import { TypeOrmUserModel } from "./modules/user/infra/models/user.model.js";
import { CreateProcessedEventsTable1710000000000 } from "./migrations/1710000000000-CreateProcessedEventsTable.js";
import { CreateUsersTable1710000000001 } from "./migrations/1710000000001-CreateUsersTable.js";

import { ValkeyService } from "common-valkey";

const strategy = new TypeORMStrategy();
export const db = new DatabaseContext(strategy);
export const valkey = new ValkeyService(config.valkey);

export const initDatabase = async () => {
  await db.connect({
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
    env: config.env,
    entities: [TypeOrmUserModel, ProcessedEventEntity],
    migrations: [
      CreateProcessedEventsTable1710000000000,
      CreateUsersTable1710000000001,
    ],
  });

  logger.info(
    {
      entityNames: [TypeOrmUserModel, ProcessedEventEntity].map(
        (e) => e.options.name,
      ),
    },
    "Entities passed to db.connect",
  );

  if (config.valkey?.enabled) {
    await valkey.connect();
  }
};
