import { IChoiceRepository } from "../../core/ports/choice.repository.js";
import { ChoiceMapper } from "../mappers/choice.mapper.js";
import { TypeOrmChoiceModel } from "../models/choice.model.js";

export class TypeOrmChoiceRepository extends IChoiceRepository {
  /**
   * @param {import('typeorm').DataSource} datasource
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   */
  constructor(datasource, valkeyRepository) {
    super();
    this.datasource = datasource;
    this.valkeyRepository = valkeyRepository;
  }

  /**
   * @private
   */
  get typeOrmRepo() {
    /** @type {import('typeorm').Repository<import('../models/choice.model.js').ChoiceModel>} */
    const repo = this.datasource.getRepository(TypeOrmChoiceModel);
    return repo;
  }

  /**
   * @param {import('../../core/entities/choice.entity.js').ChoiceEntity} entity
   * @returns {Promise<import('../../core/entities/choice.entity.js').ChoiceEntity>}
   */
  async create(entity) {
    const data = ChoiceMapper.toPersistence(entity);
    const model = this.typeOrmRepo.create(data);
    const savedModel = await this.typeOrmRepo.save(model);
    return ChoiceMapper.toDomain(savedModel);
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/choice.entity.js').ChoiceEntity} entityData
   * @returns {Promise<import('../../core/entities/choice.entity.js').ChoiceEntity | null>}
   */
  async update(id, entityData) {
    const data = ChoiceMapper.toPersistence(entityData);
    await this.typeOrmRepo.update(id, data);
    return this.findOne(id);
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
   * @returns {Promise<import('../../core/entities/choice.entity.js').ChoiceEntity | null>}
   */
  async findOne(id) {
    const model = await this.typeOrmRepo.findOne({
      where: { id },
      relations: ["question"],
    });
    return model ? ChoiceMapper.toDomain(model) : null;
  }

  /**
   * @returns {Promise<import('../../core/entities/choice.entity.js').ChoiceEntity[]>}
   */
  async findAll() {
    const models = await this.typeOrmRepo.find({ relations: ["question"] });
    return ChoiceMapper.toDomains(models);
  }

  /**
   * @param {string} questionId
   * @returns {Promise<import('../../core/entities/choice.entity.js').ChoiceEntity[]>}
   */
  async findByQuestionId(questionId) {
    const models = await this.typeOrmRepo.find({
      where: { question_id: questionId },
    });
    return ChoiceMapper.toDomains(models);
  }
}
