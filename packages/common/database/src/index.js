import { DatabaseStrategy } from "./strategy.js";
import { TypeORMStrategy } from "./typeorm.strategy.js";

/** @typedef {DatabaseStrategy} IDatabaseStrategy */

export class DatabaseContext {
  /** @type {IDatabaseStrategy | null} */
  #strategy = null;

  /**
   * @param {IDatabaseStrategy} strategy
   */
  constructor(strategy) {
    this.#strategy = strategy;
  }

  /**
   * @param {Object} config
   * @returns {Promise<void>}
   */
  async connect(config) {
    if (!this.#strategy) {
      throw new Error("No database strategy set in DatabaseContext.");
    }
    await this.#strategy.connect(config);
  }

  /**
   * @returns {Promise<any>}
   */
  async runMigrations() {
    if (!this.#strategy) {
      throw new Error("No database strategy set in DatabaseContext.");
    }
    return this.#strategy.runMigrations();
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.#strategy) {
      await this.#strategy.disconnect();
    }
  }

  /**
   * @returns {any}
   */
  get instance() {
    if (!this.#strategy) {
      throw new Error("No database strategy set in DatabaseContext.");
    }
    return this.#strategy.instance;
  }
}

export { DatabaseStrategy, TypeORMStrategy };
