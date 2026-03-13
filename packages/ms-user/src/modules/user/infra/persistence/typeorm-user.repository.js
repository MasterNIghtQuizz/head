import { IUserRepository } from "../../core/ports/user.repository.js";
import { UserMapper } from "../mappers/user.mapper.js";
import { TypeOrmUserModel } from "../models/user.model.js";

/**
 * @typedef {import('../mappers/user.mapper.js').UserPersistenceModel} UserPersistenceModel
 */

export class TypeOrmUserRepository extends IUserRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   * @param {string} encryptionKey
   */
  constructor(datasource, valkeyRepository, encryptionKey) {
    super();
    this.typeOrmRepo = datasource.getRepository(TypeOrmUserModel);
    this.valkeyRepository = valkeyRepository;
    this.encryptionKey = encryptionKey;
  }

  /**
   * @param {import('../../core/entities/user.entity.js').UserEntity} entity
   * @returns {Promise<import('../../core/entities/user.entity.js').UserEntity>}
   */
  async create(entity) {
    const data = UserMapper.toPersistence(entity, this.encryptionKey);
    const model = this.typeOrmRepo.create(data);
    const savedModel = /** @type {UserPersistenceModel} */ (
      await this.typeOrmRepo.save(model)
    );
    return UserMapper.toDomain(savedModel, this.encryptionKey);
  }

  /**
   * @param {string} id
   * @param {Partial<import('../../core/entities/user.entity.js').UserEntity>} entityData
   * @returns {Promise<void>}
   */
  async update(id, entityData) {
    const data = UserMapper.toPersistence(entityData, this.encryptionKey);
    await this.typeOrmRepo.update(id, data);
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    await this.typeOrmRepo.delete(id);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../core/entities/user.entity.js').UserEntity | null>}
   */
  async findOne(id) {
    const model = /** @type {UserPersistenceModel | null} */ (
      await this.typeOrmRepo.findOneBy({ id })
    );
    return model ? UserMapper.toDomain(model, this.encryptionKey) : null;
  }

  /**
   * @returns {Promise<import('../../core/entities/user.entity.js').UserEntity[]>}
   */
  async findAll() {
    const models = /** @type {UserPersistenceModel[]} */ (
      await this.typeOrmRepo.find()
    );
    return UserMapper.toDomains(models, this.encryptionKey);
  }

  /**
   * @param {string} emailHash
   * @returns {Promise<import('../../core/entities/user.entity.js').UserEntity | null>}
   */
  async findByEmailHash(emailHash) {
    const model = /** @type {UserPersistenceModel | null} */ (
      await this.typeOrmRepo.findOneBy({ emailHash })
    );
    return model ? UserMapper.toDomain(model, this.encryptionKey) : null;
  }
}
