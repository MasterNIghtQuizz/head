import { BaseRepository } from "common-core";
import { ChoiceEntity } from "../entities/choice.entity.js";

export class ChoiceRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   */
  constructor(datasource) {
    super(datasource, ChoiceEntity);
  }
}
