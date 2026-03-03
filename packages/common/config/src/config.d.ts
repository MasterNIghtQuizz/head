import { ObjectSchema } from "joi";

export interface ConfigOptions {
  directory: string;
  schema: ObjectSchema;
}

export declare class Config {
  static init(options: ConfigOptions): void;
  static get<T = unknown>(path: string): T;
  static get all(): Record<string, unknown> | null;
}
