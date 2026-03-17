import { BaseService } from "common-core";

export class SessionService extends BaseService {
  /**
   * @param {import('common-kafka').KafkaProducer | null} kafkaProducer
   * @param {import('../core/ports/session.repository.js').ISessionRepository} sessionRepository
   */
  constructor(kafkaProducer, sessionRepository) {
    super();
    this.sessionRepository = sessionRepository;
    this.kafkaProducer = kafkaProducer;
  }

  /**
   * @param {import('../contracts/session.dto.js').CreateSessionRequestDto} data
   * @returns {Promise<import('../contracts/session.dto.js').CreateSessionResponseDto>}
   */
  async createSession(data) {
    throw new Error("Method not implemented");
  }
}
