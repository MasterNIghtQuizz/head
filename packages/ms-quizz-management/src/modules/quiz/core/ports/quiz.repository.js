/* eslint-disable no-unused-vars */
/**
 * @interface IQuizRepository
 */
export class IQuizRepository {
  /**
   * @type {import('common-valkey').ValkeyRepository}
   */
  // @ts-ignore
  valkeyRepository;

  /**
   * @param {import('../entities/quiz.entity.js').QuizEntity} entity
   * @returns {Promise<import('../entities/quiz.entity.js').QuizEntity>}
   */
  async create(entity) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @param {Partial<import('../entities/quiz.entity.js').QuizEntity>} data
   * @returns {Promise<import('../entities/quiz.entity.js').QuizEntity | null>}
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
   * @returns {Promise<import('../entities/quiz.entity.js').QuizEntity | null>}
   */
  async findOne(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @returns {Promise<import('../entities/quiz.entity.js').QuizEntity[]>}
   */
  async findAll() {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/quiz.entity.js').QuizEntity | null>}
   */
  async findByIdWithChildren(id) {
    throw new Error("Method not implemented");
  }
}
