import { ObjectSchema } from "joi";

export class Config {
  static init(options: { directory: string; schema: ObjectSchema }): void;
  static get<T = unknown>(path: string): T;
  static get all(): Record<string, unknown> | null;
}
