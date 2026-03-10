import { BaseRepository } from "common-core";
import { QuestionEntity } from "../entities/question.entity.js";

/** @typedef {import('../models/question.model.js').Question} Question */

/**
 * @extends {BaseRepository<Question>}
 */
export class QuestionRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   */
  constructor(datasource) {
    super(datasource, QuestionEntity);
  }
}
