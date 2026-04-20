import { ISessionRepository } from "../../core/ports/session.repository.js";
import { SessionMapper } from "../mappers/session.mapper.js";
import { TypeOrmSessionModel } from "../models/session.model.js";

export class TypeOrmSessionRepository extends ISessionRepository {
  /**
   * @param {import('typeorm').DataSource} dataSource
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   */
  constructor(dataSource, valkeyRepository) {
    super();
    this.dataSource = dataSource;
    this.valkeyRepository = valkeyRepository;
    this.cacheTtl = 3600; // 1 hour
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
    const session = SessionMapper.toEntity(
      /** @type {import('../models/session.model.js').SessionModel} */ (
        savedModel
      ),
    );
    await this.valkeyRepository.set(
      `session:${session.id}`,
      session,
      this.cacheTtl,
    );
    await this.valkeyRepository.set(
      `session:pk:${session.publicKey}`,
      session,
      this.cacheTtl,
    );
    return session;
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/session.entity.js').SessionEntity} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const modelData = SessionMapper.toModel(data);
    await this.typeOrmRepository.update(id, modelData);
    await this.valkeyRepository.del(`session:${id}`);
    if (data.publicKey) {
      await this.valkeyRepository.del(`session:pk:${data.publicKey}`);
    }
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const entity = await this.find(id);
    await this.typeOrmRepository.delete(id);
    await this.valkeyRepository.del(`session:${id}`);
    if (entity?.publicKey) {
      await this.valkeyRepository.del(`session:pk:${entity.publicKey}`);
    }
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../core/entities/session.entity.js').SessionEntity | null>}
   */
  async find(id) {
    const cached = await this.valkeyRepository.get(`session:${id}`);
    if (cached) {
      return cached;
    }

    const model = await this.typeOrmRepository.findOne({ where: { id } });
    if (!model) {
      return null;
    }
    const entity = SessionMapper.toEntity(
      /** @type {import('../models/session.model.js').SessionModel} */ (model),
    );
    await this.valkeyRepository.set(`session:${id}`, entity, this.cacheTtl);
    return entity;
  }

  /**
   * @param {string} publicKey
   * @returns {Promise<import('../../core/entities/session.entity.js').SessionEntity | null>}
   */
  async findByPublicKey(publicKey) {
    const cached = await this.valkeyRepository.get(`session:pk:${publicKey}`);
    if (cached) {
      return cached;
    }

    const model = await this.typeOrmRepository.findOneBy({
      public_key: publicKey,
    });
    if (!model) {
      return null;
    }
    const entity = SessionMapper.toEntity(
      /** @type {import('../models/session.model.js').SessionModel} */ (model),
    );
    await this.valkeyRepository.set(
      `session:pk:${publicKey}`,
      entity,
      this.cacheTtl,
    );
    return entity;
  }
}
