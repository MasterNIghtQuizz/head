/* eslint-disable no-unused-vars */
/**
 * @interface IParticipantRepository
 */
export class IParticipantRepository {
  /**
   * @param {import('../entities/participant.entity.js').ParticipantEntity} entity
   * @returns {Promise<import('../entities/participant.entity.js').ParticipantEntity>}
   */
  async create(entity) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @param {Partial<import('../entities/participant.entity.js').ParticipantEntity>} data
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
   * @returns {Promise<import('../entities/participant.entity.js').ParticipantEntity | null>}
   */
  async find(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('../entities/participant.entity.js').ParticipantEntity[]>}
   */
  async findBySessionId(sessionId) {
    throw new Error("Method not implemented");
  }
}
