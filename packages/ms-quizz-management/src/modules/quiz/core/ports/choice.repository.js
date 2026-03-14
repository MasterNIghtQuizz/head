/* eslint-disable no-unused-vars */
/**
 * @interface IChoiceRepository
 */
export class IChoiceRepository {
  /**
   * @type {import('common-valkey').ValkeyRepository}
   */
  // @ts-ignore
  valkeyRepository;

  /**
   * @param {import('../entities/choice.entity.js').ChoiceEntity} entity
   * @returns {Promise<import('../entities/choice.entity.js').ChoiceEntity>}
   */
  async create(entity) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @param {Partial<import('../entities/choice.entity.js').ChoiceEntity>} data
   * @returns {Promise<import('../entities/choice.entity.js').ChoiceEntity | null>}
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
   * @returns {Promise<import('../entities/choice.entity.js').ChoiceEntity | null>}
   */
  async findOne(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @returns {Promise<import('../entities/choice.entity.js').ChoiceEntity[]>}
   */
  async findAll() {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} questionId
   * @returns {Promise<import('../entities/choice.entity.js').ChoiceEntity[]>}
   */
  async findByQuestionId(questionId) {
    throw new Error("Method not implemented");
  }
}
