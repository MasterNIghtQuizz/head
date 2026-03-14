/* eslint-disable no-unused-vars */
/**
 * @interface IQuestionRepository
 */
export class IQuestionRepository {
  /**
   * @type {import('common-valkey').ValkeyRepository}
   */
  // @ts-ignore
  valkeyRepository;

  /**
   * @param {import('../entities/question.entity.js').QuestionEntity} entity
   * @returns {Promise<import('../entities/question.entity.js').QuestionEntity>}
   */
  async create(entity) {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} id
   * @param {Partial<import('../entities/question.entity.js').QuestionEntity>} data
   * @returns {Promise<import('../entities/question.entity.js').QuestionEntity | null>}
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
   * @returns {Promise<import('../entities/question.entity.js').QuestionEntity | null>}
   */
  async findOne(id) {
    throw new Error("Method not implemented");
  }

  /**
   * @returns {Promise<import('../entities/question.entity.js').QuestionEntity[]>}
   */
  async findAll() {
    throw new Error("Method not implemented");
  }

  /**
   * @param {string} quizId
   * @returns {Promise<import('../entities/question.entity.js').QuestionEntity[]>}
   */
  async findByQuizId(quizId) {
    throw new Error("Method not implemented");
  }
  /**
   * @param {string} id
   * @returns {Promise<import('../entities/question.entity.js').QuestionEntity | null>}
   */
  async findByIdWithChildren(id) {
    throw new Error("Method not implemented");
  }
}
