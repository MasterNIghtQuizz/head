import { IParticipantRepository } from "../../core/ports/participant.repository.js";
import { ParticipantMapper } from "../mappers/participant.mapper.js";
import { TypeOrmParticipantModel } from "../models/participant.model.js";

export class TypeOrmParticipantRepository extends IParticipantRepository {
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
    return ParticipantMapper.toEntity(
      /** @type {import('../models/participant.model.js').ParticipantModel} */ (
        savedModel
      ),
    );
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/participant.entity.js').ParticipantEntity} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const modelData = ParticipantMapper.toModel(data);
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
   * @returns {Promise<import('../../core/entities/participant.entity.js').ParticipantEntity | null>}
   */
  async find(id) {
    const model = await this.typeOrmRepository.findOneBy({ id });
    if (!model) {
      return null;
    }
    return ParticipantMapper.toEntity(
      /** @type {import('../models/participant.model.js').ParticipantModel} */ (
        model
      ),
    );
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('../../core/entities/participant.entity.js').ParticipantEntity[]>}
   */
  async findBySessionId(sessionId) {
    const models = await this.typeOrmRepository.findBy({
      session_id: sessionId,
    });
    return models.map((p) =>
      ParticipantMapper.toEntity(
        /** @type {import('../models/participant.model.js').ParticipantModel} */ (
          p
        ),
      ),
    );
  }
}
