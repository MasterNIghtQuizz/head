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
    const data = await this.#valkeyService.client.get(key);
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   * @param {number} [ttl] Seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl) {
    const serializedValue =
      typeof value === "string" ? value : JSON.stringify(value);
    if (ttl) {
      await this.#valkeyService.client.set(key, serializedValue, "EX", ttl);
    } else {
      await this.#valkeyService.client.set(key, serializedValue);
    }
  }

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  async del(key) {
    await this.#valkeyService.client.del(key);
  }

  /**
   * @param {string} pattern
   * @returns {Promise<void>}
   */
  async delByPattern(pattern) {
    const keys = await this.#valkeyService.client.keys(pattern);
    if (keys.length > 0) {
      await this.#valkeyService.client.del(...keys);
    }
  }
}
