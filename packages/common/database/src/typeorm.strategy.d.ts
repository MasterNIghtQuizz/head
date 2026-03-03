import { DataSource, EntitySchema, MixedList } from "typeorm";
import { DatabaseStrategy } from "./strategy.js";

export declare class TypeORMStrategy extends DatabaseStrategy {
  connect(options: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    env: "development" | "production" | "test";
    entities?: MixedList<string | Function | EntitySchema<any>>;
    migrations?: MixedList<string | Function>;
  }): Promise<void>;
  runMigrations(): Promise<any>;
  disconnect(): Promise<void>;

  get instance(): DataSource;
}
