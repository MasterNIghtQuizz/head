import { BaseRepository } from "common-core";
import { QuizEntity } from "../entities/quiz.entity.js";

/** @typedef {import('../models/quiz.model.js').Quiz} Quiz */

/**
 * @extends {BaseRepository<Quiz>}
 */
export class QuizRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   */
  constructor(datasource) {
    super(datasource, QuizEntity);
  }
}
