import { loadConfig } from "./config-loader.js";
import logger from "common-logger";

/** @type {typeof import('./config.d.ts').Config} */
export class Config {
  /** @type {Record<string, unknown> | null} */
  static #config = null;

  /** @param {import('./config.d.ts').ConfigOptions} options */
  static init({ directory, schema }) {
    if (this.#config) {
      logger.warn("Config already initialized");
      return;
    }

    const rawConfig = loadConfig(directory);
    const { value, error } = schema.validate(rawConfig, {
      allowUnknown: true,
      abortEarly: false,
    });

    if (error) {
      logger.error({ error: error.details }, "Config validation failed");
      throw new Error("Config validation failed");
    }

    this.#config = value;
    logger.info("Config initialized successfully");
  }

  /** @param {string} path */
  static get(path) {
    if (!this.#config) {
      throw new Error("Config not initialized. Call Config.init() first.");
    }

    const value = path
      .split(".")
      .reduce(
        (/** @type {any} */ acc, part) => acc?.[part],
        /** @type {unknown} */ (this.#config),
      );

    if (value === undefined) {
      throw new Error(`Config path "${path}" not found`);
    }

    return value;
  }

  static get all() {
    return this.#config;
  }
}
