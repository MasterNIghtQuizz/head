import { IQuizRepository } from "../../core/ports/quiz.repository.js";
import { QuizMapper } from "../mappers/quiz.mapper.js";
import { TypeOrmQuizModel } from "../models/quiz.model.js";

export class TypeOrmQuizRepository extends IQuizRepository {
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
    /** @type {import('typeorm').Repository<import('../models/quiz.model.js').QuizModel>} */
    const repo = this.datasource.getRepository(TypeOrmQuizModel);
    return repo;
  }

  /**
   * @param {import('../../core/entities/quiz.entity.js').QuizEntity} entity
   * @returns {Promise<import('../../core/entities/quiz.entity.js').QuizEntity>}
   */
  async create(entity) {
    const data = QuizMapper.toPersistence(entity);
    const model = this.typeOrmRepo.create(data);
    const savedModel = await this.typeOrmRepo.save(model);
    return QuizMapper.toDomain(savedModel);
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/quiz.entity.js').QuizEntity} entityData
   * @returns {Promise<import('../../core/entities/quiz.entity.js').QuizEntity | null>}
   */
  async update(id, entityData) {
    const data = QuizMapper.toPersistence(entityData);
    await this.typeOrmRepo.update(id, data);
    const updated = await this.findOne(id);
    return updated;
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
   * @returns {Promise<import('../../core/entities/quiz.entity.js').QuizEntity | null>}
   */
  async findOne(id) {
    const model = await this.typeOrmRepo.findOneBy({ id });
    return model ? QuizMapper.toDomain(model) : null;
  }

  /**
   * @returns {Promise<import('../../core/entities/quiz.entity.js').QuizEntity[]>}
   */
  async findAll() {
    const models = await this.typeOrmRepo.find();
    return QuizMapper.toDomains(models);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../core/entities/quiz.entity.js').QuizEntity | null>}
   */
  async findByIdWithChildren(id) {
    const model = await this.typeOrmRepo.findOne({
      where: { id },
      relations: ["questions", "questions.choices"],
    });
    return model ? QuizMapper.toDomain(model) : null;
  }
}
