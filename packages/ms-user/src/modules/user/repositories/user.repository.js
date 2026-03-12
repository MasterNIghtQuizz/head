import { BaseRepository } from "common-core";
import { UserEntity } from "../entities/user.entity.js";

/**
 * @extends {BaseRepository<import('../entities/user.entity.js').UserEntity>}
 */
export class UserRepository extends BaseRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   */
  constructor(datasource, valkeyRepository) {
    super(datasource, UserEntity);
    this.valkeyRepository = valkeyRepository;
  }

  /**
   * @param {string} email
   * @returns {Promise<any|null>}
   */
  async findByEmail(email) {
    const repo =
      /** @type {import('typeorm').Repository<import('../entities/user.entity.js').UserEntity>} */ (
        this.repo
      );
    return repo.findOneBy({ email });
  }

  /**
   * @param {string} emailHash
   * @returns {Promise<any|null>}
   */
  async findByEmailHash(emailHash) {
    const repo =
      /** @type {import('typeorm').Repository<import('../entities/user.entity.js').UserEntity>} */ (
        this.repo
      );
    return repo.findOneBy({ emailHash });
  }
}
