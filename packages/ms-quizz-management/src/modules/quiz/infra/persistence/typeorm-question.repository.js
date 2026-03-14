import { IQuestionRepository } from "../../core/ports/question.repository.js";
import { QuestionMapper } from "../mappers/question.mapper.js";
import { TypeOrmQuestionModel } from "../models/question.model.js";

export class TypeOrmQuestionRepository extends IQuestionRepository {
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
    /** @type {import('typeorm').Repository<import('../models/question.model.js').QuestionModel>} */
    // @ts-ignore
    const repo = this.datasource.getRepository(TypeOrmQuestionModel);
    return repo;
  }

  /**
   * @param {import('../../core/entities/question.entity.js').QuestionEntity} entity
   * @returns {Promise<import('../../core/entities/question.entity.js').QuestionEntity>}
   */
  async create(entity) {
    const data = QuestionMapper.toPersistence(entity);
    const model = this.typeOrmRepo.create(data);
    const savedModel = await this.typeOrmRepo.save(model);
    return QuestionMapper.toDomain(savedModel);
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/question.entity.js').QuestionEntity} entityData
   * @returns {Promise<import('../../core/entities/question.entity.js').QuestionEntity | null>}
   */
  async update(id, entityData) {
    const data = QuestionMapper.toPersistence(entityData);
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
   * @returns {Promise<import('../../core/entities/question.entity.js').QuestionEntity | null>}
   */
  async findOne(id) {
    const model = await this.typeOrmRepo.findOne({
      where: { id },
      relations: ["quiz"],
    });
    return model ? QuestionMapper.toDomain(model) : null;
  }

  /**
   * @returns {Promise<import('../../core/entities/question.entity.js').QuestionEntity[]>}
   */
  async findAll() {
    const models = await this.typeOrmRepo.find({ relations: ["quiz"] });
    return QuestionMapper.toDomains(models);
  }

  /**
   * @param {string} quizId
   * @returns {Promise<import('../../core/entities/question.entity.js').QuestionEntity[]>}
   */
  async findByQuizId(quizId) {
    const models = await this.typeOrmRepo.find({
      where: { quiz_id: quizId },
      relations: ["quiz"],
    });
    return QuestionMapper.toDomains(models);
  }
  /**
   * @param {string} id
   * @returns {Promise<import('../../core/entities/question.entity.js').QuestionEntity | null>}
   */
  async findByIdWithChildren(id) {
    const model = await this.typeOrmRepo.findOne({
      where: { id },
      relations: ["choices"],
    });
    return model ? QuestionMapper.toDomain(model) : null;
  }
}
