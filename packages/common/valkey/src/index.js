import { Redis } from "ioredis";
import logger from "common-logger";

/**
 * @typedef {Object} ValkeyConfig
 * @property {string} host
 * @property {number} port
 * @property {string} [password]
 * @property {number} [db]
 */

export class ValkeyService {
  /** @type {Redis | null} */
  #client = null;

  /** @type {ValkeyConfig} */
  #config;

  /**
   * @param {ValkeyConfig} config
   */
  constructor(config) {
    this.#config = config;
  }

  /**
   * @returns {Promise<Redis>}
   */
  async connect() {
    if (this.#client) {
      return this.#client;
    }

    this.#client = new Redis({
      host: this.#config.host,
      port: this.#config.port,
      password: this.#config.password,
      db: this.#config.db || 0,
      lazyConnect: true,
      /** @param {number} times */
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.#client.on("connect", () => {
      logger.info(
        { host: this.#config.host, port: this.#config.port },
        "Connecting to Valkey...",
      );
    });

    this.#client.on("ready", () => {
      logger.info("Valkey client ready");
    });

    /** @param {Error} err */
    this.#client.on("error", (err) => {
      logger.error({ err }, "Valkey client error");
    });

    this.#client.on("close", () => {
      logger.warn("Valkey connection closed");
    });

    await this.#client.connect();
    return this.#client;
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.#client) {
      await this.#client.quit();
      this.#client = null;
      logger.info("Valkey client disconnected");
    }
  }

  /**
   * @returns {Redis}
   */
  get client() {
    if (!this.#client) {
      throw new Error("Valkey client not connected. Call connect() first.");
    }
    return this.#client;
  }
}

export * from "./repository.js";
