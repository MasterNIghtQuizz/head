import { DatabaseStrategy } from "./src/strategy.js";
import { TypeORMStrategy } from "./src/typeorm.strategy.js";

export declare class DatabaseContext {
  constructor(strategy: DatabaseStrategy);
  connect(config: Record<string, any>): Promise<void>;
  runMigrations(): Promise<any>;
  disconnect(): Promise<void>;
  get instance(): any;
}

export { DatabaseStrategy, TypeORMStrategy };
