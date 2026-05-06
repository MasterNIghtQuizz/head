import logger from "common-logger";

/** @typedef {import('./index.js').ValkeyService} ValkeyService */

export class ValkeyRepository {
  /** @type {ValkeyService} */
  #valkeyService;

  /**
   * @param {ValkeyService} valkeyService
   */
  constructor(valkeyService) {
    this.#valkeyService = valkeyService;
  }

  /**
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      const data = await this.#valkeyService.client.get(key);
      if (!data) {
        return null;
      }
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (err) {
      logger.warn({ err, key }, "Valkey get failed: degraded mode");
      return null;
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   * @param {number} [ttl] Seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl) {
    try {
      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);
      if (ttl) {
        await this.#valkeyService.client.set(key, serializedValue, "EX", ttl);
      } else {
        await this.#valkeyService.client.set(key, serializedValue);
      }
    } catch (err) {
      logger.warn({ err, key }, "Valkey set failed: degraded mode");
    }
  }

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.#valkeyService.client.del(key);
    } catch (err) {
      logger.warn({ err, key }, "Valkey del failed: degraded mode");
    }
  }

  /**
   * @param {string} pattern
   * @returns {Promise<void>}
   */
  async delByPattern(pattern) {
    try {
      const keys = await this.#valkeyService.client.keys(pattern);
      if (keys.length > 0) {
        await this.#valkeyService.client.del(...keys);
      }
    } catch (err) {
      logger.warn(
        { err, pattern },
        "Valkey delByPattern failed: degraded mode",
      );
    }
  }
  /**
   * @param {string} channel
   * @param {string} message
   * @returns {Promise<number>}
   */
  async publish(channel, message) {
    try {
      return await this.#valkeyService.client.publish(channel, message);
    } catch (err) {
      logger.warn({ err, channel }, "Valkey publish failed: degraded mode");
      return 0;
    }
  }
}
