import { ISessionRepository } from "../../core/ports/session.repository.js";
import { SessionMapper } from "../mappers/session.mapper.js";
import { TypeOrmSessionModel } from "../models/session.model.js";

export class TypeOrmSessionRepository extends ISessionRepository {
  /**
   * @param {import('typeorm').DataSource} dataSource
   */

  constructor(dataSource) {
    super();
    this.dataSource = dataSource;
  }

  /**
   * @private
   */
  get typeOrmRepository() {
    /** @type {import('typeorm').Repository<import('../models/session.model.js').SessionModel>} */
    return this.dataSource.getRepository(TypeOrmSessionModel);
  }

  /**
   * @param {import('../../core/entities/session.entity.js').SessionEntity} entity
   * @returns {Promise<import('../../core/entities/session.entity.js').SessionEntity>}
   */
  async create(entity) {
    const data = SessionMapper.toModel(entity);
    const model = this.typeOrmRepository.create(data);
    const savedModel = await this.typeOrmRepository.save(model);
    return SessionMapper.toEntity(
      /** @type {import('../models/session.model.js').SessionModel} */ (
        savedModel
      ),
    );
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/session.entity.js').SessionEntity} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const modelData = SessionMapper.toModel(data);
    await this.typeOrmRepository.update(id, modelData);
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    await this.typeOrmRepository.delete(id);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../core/entities/session.entity.js').SessionEntity | null>}
   */
  async find(id) {
    const model = await this.typeOrmRepository.findOne({ where: { id } });
    if (!model) {
      return null;
    }
    return SessionMapper.toEntity(
      /** @type {import('../models/session.model.js').SessionModel} */ (model),
    );
  }

  /**
   * @param {string} publicKey
   * @returns {Promise<import('../../core/entities/session.entity.js').SessionEntity | null>}
   */
  async findByPublicKey(publicKey) {
    const model = await this.typeOrmRepository.findOneBy({
      public_key: publicKey,
    });
    if (!model) {
      return null;
    }
    return SessionMapper.toEntity(
      /** @type {import('../models/session.model.js').SessionModel} */ (model),
    );
  }
}
