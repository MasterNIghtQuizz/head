import { DataSource } from "typeorm";
import { DatabaseStrategy } from "./strategy.js";
import logger from "common-logger";

/**
 * @extends {DatabaseStrategy}
 */
export class TypeORMStrategy extends DatabaseStrategy {
  /** @type {DataSource | null} */
  #dataSource = null;

  /**
   * @param {Object} options
   * @param {string} options.host
   * @param {number} options.port
   * @param {string} options.user
   * @param {string} options.password
   * @param {string} options.database
   * @param {string} options.env
   * @param {Array<any>} [options.entities=[]]
   * @param {Array<any>} [options.migrations=[]]
   * @returns {Promise<void>}
   */
  async connect({
    host,
    port,
    user,
    password,
    database,
    env,
    entities = [],
    migrations = [],
  }) {
    if (this.#dataSource?.isInitialized) {
      logger.warn(`Data source for ${database} is already initialized`);
      return;
    }

    this.#dataSource = new DataSource({
      type: "postgres",
      host,
      port: Number(port),
      username: user,
      password: password,
      database: database,
      entities,
      migrations,
      synchronize: env === "development",
      logging: env === "development",
    });

    try {
      await this.#dataSource.initialize();
      logger.info(`TypeORM Strategy connected to database: ${database}`);
    } catch (error) {
      logger.error({ error }, `TypeORM connection failed for: ${database}`);
      throw error;
    }
  }

  /**
   * @returns {Promise<import("typeorm").Migration[]>}
   */
  async runMigrations() {
    if (!this.#dataSource?.isInitialized) {
      throw new Error("Cannot run migrations: Data source not initialized.");
    }
    const performed = await this.#dataSource.runMigrations();
    logger.info({ count: performed.length }, "Migrations performed");
    return performed;
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.#dataSource?.isInitialized) {
      await this.#dataSource.destroy();
      logger.info("TypeORM Strategy disconnected");
    }
  }

  /**
   * @returns {DataSource}
   */
  get instance() {
    if (!this.#dataSource) {
      throw new Error("Data source not initialized. Call connect() first.");
    }
    return this.#dataSource;
  }
}
