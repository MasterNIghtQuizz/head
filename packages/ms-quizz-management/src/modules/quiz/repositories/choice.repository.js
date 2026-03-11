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
   * @param {import('typeorm').DeepPartial<import('../models/choice.model.js').Choice> & { question_id?: string }} data
   * @returns {Promise<import('../models/choice.model.js').Choice>}
   */
  async create(data) {
    const entityData = { ...data };
    if (entityData.question_id) {
      entityData.question = { id: entityData.question_id };
      delete entityData.question_id;
    }
    const repo =
      /** @type {import('typeorm').Repository<import('../models/choice.model.js').Choice>} */ (
        this.repo
      );
    const entry = repo.create(entityData);
    return repo.save(entry);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../models/choice.model.js').Choice|null>}
   */
  async findOne(id) {
    const repo =
      /** @type {import('typeorm').Repository<import('../models/choice.model.js').Choice>} */ (
        this.repo
      );
    return repo.findOne({
      where: { id },
      relations: ["question"],
    });
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
