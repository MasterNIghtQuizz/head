/* eslint-disable no-unused-vars */
/**
 * @interface ISessionRepository
 */
export class ISessionRepository {
  /**
   * @param {import('../entities/session.entity.js').SessionEntity} entity
   * @returns {Promise<import('../entities/session.entity.js').SessionEntity>}
   */
  async create(entity) {}

  /**
   * @param {string} id
   * @param {Partial<import('../entities/session.entity.js').SessionEntity>} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/session.entity.js').SessionEntity | null>}
   */
  async find(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} publicKey
   * @returns {Promise<import('../entities/session.entity.js').SessionEntity | null>}
   */
  async findByPublicKey(publicKey) {
    throw new Error("Method not implemented");
  }
}
