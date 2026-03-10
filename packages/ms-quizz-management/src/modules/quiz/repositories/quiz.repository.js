import { BaseRepository } from "common-core";
import { QuizEntity } from "../entities/quiz.entity.js";

/**
 * @extends {BaseRepository<import('../models/quiz.model.js').Quiz>}
 */
export class QuizRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   */
  constructor(datasource) {
    super(datasource, QuizEntity);
  }
}
