import { loadConfig, merge } from "./config-loader.js";
import logger from "common-logger";

/** @type {typeof import('./config.d.ts').Config} */
export class Config {
  /** @type {any | null} */
  static #config = null;

  /** @param {import('./config.d.ts').ConfigOptions} options */
  static init({ directory, schema }) {
    const rawConfig = loadConfig(directory);
    const { value, error } = schema.validate(rawConfig, {
      allowUnknown: true,
      abortEarly: false,
    });

    if (error) {
      logger.error({ error: error.details }, "Config validation failed");
      throw new Error("Config validation failed");
    }

    if (this.#config) {
      this.#config = merge(this.#config, value);
      logger.info("Config merged successfully");
    } else {
      this.#config = value;
      logger.info("Config initialized successfully");
    }
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
