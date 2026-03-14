import { BaseRepository } from "common-core";
import { In } from "typeorm";
import { QuestionEntity } from "../entities/question.entity.js";

/**
 * @extends {BaseRepository<import('../models/question.model.js').Question>}
 * @property {import('typeorm').Repository<import('../models/question.model.js').Question>} repo
 */
export class QuestionRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   */
  constructor(datasource) {
    super(datasource, QuestionEntity);
  }

  /**
   * @param {import('typeorm').DeepPartial<import('../models/question.model.js').Question> & { quiz_id?: string }} data
   * @returns {Promise<import('../models/question.model.js').Question>}
   */
  async create(data) {
    const entityData = { ...data };
    if (entityData.quiz_id) {
      entityData.quiz = { id: entityData.quiz_id };
      delete entityData.quiz_id;
    }
    const repo =
      /** @type {import('typeorm').Repository<import('../models/question.model.js').Question>} */ (
        this.repo
      );
    const entry = repo.create(entityData);
    return repo.save(entry);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../models/question.model.js').Question|null>}
   */
  async findOne(id) {
    const repo =
      /** @type {import('typeorm').Repository<import('../models/question.model.js').Question>} */ (
        this.repo
      );
    return repo.findOne({
      where: { id },
      relations: ["quiz", "choices"],
    });
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<import('../models/question.model.js').Question[]>}
   */
  async findByIds(ids) {
    const repo =
      /** @type {import('typeorm').Repository<import('../models/question.model.js').Question>} */ (
        this.repo
      );
    return repo.find({
      where: { id: In(ids) },
    });
  }

  /**
   * @param {string} quizId
   * @returns {Promise<import('../models/question.model.js').Question[]>}
   */
  async findByQuizId(quizId) {
    const repo =
      /** @type {import('typeorm').Repository<import('../models/question.model.js').Question>} */ (
        this.repo
      );
    return repo.find({
      where: { quiz: { id: quizId } },
      order: { order_index: "ASC" },
    });
  }
}
