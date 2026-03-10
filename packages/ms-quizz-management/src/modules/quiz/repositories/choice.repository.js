import { BaseRepository } from "common-core";
import { ChoiceEntity } from "../entities/choice.entity.js";

/**
 * @extends {BaseRepository<import('../models/choice.model.js').Choice>}
 * @property {import('typeorm').Repository<import('../models/choice.model.js').Choice>} repo
 */
export class ChoiceRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   */
  constructor(datasource) {
    super(datasource, ChoiceEntity);
  }

  /**
   * @param {string} questionId
   * @returns {Promise<import('../models/choice.model.js').Choice[]>}
   */
  async findByQuestionId(questionId) {
    const repo =
      /** @type {import('typeorm').Repository<import('../models/choice.model.js').Choice>} */ (
        this.repo
      );
    return repo.find({
      where: {
        question: { id: questionId },
      },
    });
  }
}
