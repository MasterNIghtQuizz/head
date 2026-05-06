import { EntitySchema, DataSource } from "typeorm";
import { DatabaseStrategy } from "./strategy.js";
import { TypeORMStrategy } from "./typeorm.strategy.js";
import { ProcessedEventEntity } from "./entities/processed-event.entity.js";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  env?: string;
  entities?: any[];
  migrations?: any[];
}

export declare class DatabaseContext {
  constructor(strategy: DatabaseStrategy);
  connect(config: DatabaseConfig): Promise<void>;
  runMigrations(): Promise<any>;
  disconnect(): Promise<void>;
  get instance(): DataSource;
}

export {
  DatabaseStrategy,
  TypeORMStrategy,
  ProcessedEventEntity,
  EntitySchema,
  DataSource,
};
