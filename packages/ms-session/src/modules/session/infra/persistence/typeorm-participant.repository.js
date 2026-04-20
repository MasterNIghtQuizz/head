import { IParticipantRepository } from "../../core/ports/participant.repository.js";
import { ParticipantMapper } from "../mappers/participant.mapper.js";
import { TypeOrmParticipantModel } from "../models/participant.model.js";

export class TypeOrmParticipantRepository extends IParticipantRepository {
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
    /** @type {import('typeorm').Repository<import('../models/participant.model.js').ParticipantModel>} */
    return this.dataSource.getRepository(TypeOrmParticipantModel);
  }

  /**
   * @param {import('../../core/entities/participant.entity.js').ParticipantEntity} entity
   * @returns {Promise<import('../../core/entities/participant.entity.js').ParticipantEntity>}
   */
  async create(entity) {
    const data = ParticipantMapper.toModel(entity);
    const model = this.typeOrmRepository.create(data);
    const savedModel = await this.typeOrmRepository.save(model);
    const participant = ParticipantMapper.toEntity(
      /** @type {import('../models/participant.model.js').ParticipantModel} */ (
        savedModel
      ),
    );
    await this.valkeyRepository.set(
      `participant:${participant.id}`,
      participant,
      this.cacheTtl,
    );
    await this.valkeyRepository.del(
      `session:${participant.sessionId}:participants`,
    );
    return participant;
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/participant.entity.js').ParticipantEntity} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const modelData = ParticipantMapper.toModel(data);
    await this.typeOrmRepository.update(id, modelData);
    const participant = await this.find(id);
    await this.valkeyRepository.del(`participant:${id}`);
    if (participant) {
      await this.valkeyRepository.del(
        `session:${participant.sessionId}:participants`,
      );
    }
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const participant = await this.find(id);
    await this.typeOrmRepository.delete(id);
    await this.valkeyRepository.del(`participant:${id}`);
    if (participant) {
      await this.valkeyRepository.del(
        `session:${participant.sessionId}:participants`,
      );
    }
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../core/entities/participant.entity.js').ParticipantEntity | null>}
   */
  async find(id) {
    const cached = await this.valkeyRepository.get(`participant:${id}`);
    if (cached) {
      return cached;
    }

    const model = await this.typeOrmRepository.findOneBy({ id });
    if (!model) {
      return null;
    }
    const entity = ParticipantMapper.toEntity(
      /** @type {import('../models/participant.model.js').ParticipantModel} */ (
        model
      ),
    );
    await this.valkeyRepository.set(`participant:${id}`, entity, this.cacheTtl);
    return entity;
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('../../core/entities/participant.entity.js').ParticipantEntity[]>}
   */
  async findBySessionId(sessionId) {
    const cached = await this.valkeyRepository.get(
      `session:${sessionId}:participants`,
    );
    if (cached) {
      return cached;
    }

    const models = await this.typeOrmRepository.findBy({
      session_id: sessionId,
    });
    const entities = models.map((p) =>
      ParticipantMapper.toEntity(
        /** @type {import('../models/participant.model.js').ParticipantModel} */ (
          p
        ),
      ),
    );
    await this.valkeyRepository.set(
      `session:${sessionId}:participants`,
      entities,
      this.cacheTtl,
    );
    return entities;
  }
}
