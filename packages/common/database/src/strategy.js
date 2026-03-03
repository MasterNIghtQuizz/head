/**
 * @abstract
 * Database Connection Strategy interface
 */
export class DatabaseStrategy {
  /**
   * @param {Object} _config
   * @returns {Promise<void>}
   */
  async connect(_config) {
    throw new Error('Method "connect" must be implemented');
  }

  /**
   * @returns {Promise<any>}
   */
  async runMigrations() {
    throw new Error('Method "runMigrations" must be implemented');
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method "disconnect" must be implemented');
  }

  /**
   * @returns {any}
   */
  get instance() {
    throw new Error('Method "instance" must be implemented');
  }
}
