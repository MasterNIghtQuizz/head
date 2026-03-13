/* eslint-disable no-unused-vars */
/**
 * @interface IUserRepository
 */
export class IUserRepository {
  /** @type {import('common-valkey').ValkeyRepository} */
  // @ts-ignore
  valkeyRepository;

  /**
   * @param {import('../entities/user.entity.js').UserEntity} entity
   * @returns {Promise<import('../entities/user.entity.js').UserEntity>}
   */
  async create(entity) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @param {Partial<import('../entities/user.entity.js').UserEntity>} data
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
   * @returns {Promise<import('../entities/user.entity.js').UserEntity | null>}
   */
  async findOne(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @returns {Promise<import('../entities/user.entity.js').UserEntity[]>}
   */
  async findAll() {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} emailHash
   * @returns {Promise<import('../entities/user.entity.js').UserEntity | null>}
   */
  async findByEmailHash(emailHash) {
    throw new Error("Method not implemented");
  }
}
