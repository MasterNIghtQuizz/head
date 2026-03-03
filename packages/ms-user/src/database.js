import { DatabaseContext, TypeORMStrategy } from "common-database";
import { config } from "./config.js";
import { UserEntity } from "./modules/user/entities/user.entity.js";

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
    entities: [UserEntity],
  });
};
