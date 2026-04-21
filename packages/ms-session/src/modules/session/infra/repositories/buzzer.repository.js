export class BuzzerRepository {
  /** @type {import('ioredis').Redis} */
  client;

  /** @param {import('@common/valkey/src/index.js').ValkeyService} valkeyService */
  constructor(valkeyService) {
    this.client = valkeyService.client;
  }

  /**
   * @param {string} sessionId
   * @param {import('common-contracts').QuizResponseSubmittedEventPayload} entry
   * @returns {Promise<number>}
   */
  async push(sessionId, entry) {
    const key = `session:${sessionId}:buzzer_queue`;
    const payload = JSON.stringify(entry);
    return await this.client.rpush(key, payload);
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('common-contracts').QuizResponseSubmittedEventPayload | null>}
   */
  async peek(sessionId) {
    const key = `session:${sessionId}:buzzer_queue`;
    const data = await this.client.lindex(key, 0);
    return data ? JSON.parse(data) : null;
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async pop(sessionId) {
    const key = `session:${sessionId}:buzzer_queue`;
    await this.client.lpop(key);
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async clear(sessionId) {
    const key = `session:${sessionId}:buzzer_queue`;
    await this.client.del(key);
  }

  /**
   * @param {string} sessionId
   * @param {string} participantId
   * @returns {Promise<boolean>} */
  async hasBuzzed(sessionId, participantId) {
    const key = `session:${sessionId}:buzzer_queue`;
    const queue = await this.client.lrange(key, 0, -1);
    return queue.some((entry) => {
      const data = JSON.parse(entry);
      return data.participantId === participantId;
    });
  }
}
