import { DatabaseStrategy } from "./src/strategy.js";
import { TypeORMStrategy } from "./src/typeorm.strategy.js";
import { ProcessedEventEntity } from "./src/entities/processed-event.entity.js";
import { DataSource } from "typeorm";

export declare class DatabaseContext {
  constructor(strategy: DatabaseStrategy);
  connect(config: Record<string, any>): Promise<void>;
  runMigrations(): Promise<any>;
  disconnect(): Promise<void>;
  get instance(): DataSource;
}

export { DatabaseStrategy, TypeORMStrategy, ProcessedEventEntity };
