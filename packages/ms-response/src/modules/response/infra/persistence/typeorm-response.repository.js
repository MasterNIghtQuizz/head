import { ResponseRepository } from "../../core/ports/response.repository.js";
import { ResponseMapper } from "../mappers/response.mapper.js";
import { ResponseModel } from "../models/response.model.js";

export class TypeOrmResponseRepository extends ResponseRepository {
  /** @type {import('typeorm').DataSource} */
  datasource;

  /** @type {import('common-valkey').ValkeyRepository} */
  valkeyRepository;

  /**
   * @param {import('typeorm').DataSource} datasource
   * @param {import('common-valkey').ValkeyRepository} valkeyRepository
   */
  constructor(datasource, valkeyRepository) {
    super();
    this.datasource = datasource;
    this.valkeyRepository = valkeyRepository;
  }

  get repo() {
    return this.datasource.getRepository(ResponseModel);
  }

  /**
   * @param {import('../../core/entities/response.entity.js').ResponseEntity} entity
   * @returns {Promise<import('../../core/entities/response.entity.js').ResponseEntity>}
   */
  async create(entity) {
    const model = this.repo.create(ResponseMapper.toPersistence(entity));
    const saved = await this.repo.save(model);
    return ResponseMapper.toDomain(saved);
  }

  /**
   * @param {string} id
   * @param {import('../../core/entities/response.entity.js').ResponseEntity} entity
   * @returns {Promise<void>}
   */
  async update(id, entity) {
    await this.repo.update(id, ResponseMapper.toPersistence(entity));
  }

  /**
   * @param {string} participantId
   * @param {string} questionId
   * @returns {Promise<import('../../core/entities/response.entity.js').ResponseEntity | null>}
   */
  async findByParticipantAndQuestion(participantId, questionId) {
    const res = await this.repo.findOne({
      where: {
        participant_id: participantId,
        question_id: questionId,
      },
    });

    return res ? ResponseMapper.toDomain(res) : null;
  }

  /**
   * @param {string} participantId
   * @param {string} sessionId
   * @returns {Promise<import('../../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async findByParticipantAndSession(participantId, sessionId) {
    const results = await this.repo.find({
      where: {
        participant_id: participantId,
        session_id: sessionId,
      },
    });

    return results.map(ResponseMapper.toDomain);
  }

  /**
   * @param {string} questionId
   * @param {string} sessionId
   * @returns {Promise<import('../../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async findByQuestionAndSession(questionId, sessionId) {
    const results = await this.repo.find({
      where: {
        question_id: questionId,
        session_id: sessionId,
      },
    });

    return results.map(ResponseMapper.toDomain);
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<import('../../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async findBySession(sessionId) {
    const results = await this.repo.find({
      where: {
        session_id: sessionId,
      },
    });

    return results.map(ResponseMapper.toDomain);
  }

  /**
   * @param {string} participantId
   * @returns {Promise<import('../../core/entities/response.entity.js').ResponseEntity[]>}
   */
  async findByParticipant(participantId) {
    const results = await this.repo.find({
      where: { participant_id: participantId },
    });

    return results.map(ResponseMapper.toDomain);
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async deleteBySessionId(sessionId) {
    await this.repo.delete({ session_id: sessionId });
  }
}
