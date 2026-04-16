import { ResponseRepository } from "../../core/ports/response.repository.js";
import { ResponseMapper } from "../mappers/response.mapper.js";

export class TypeOrmResponseRepository extends ResponseRepository {
  constructor(typeOrmRepo) {
    super();
    this.repo = typeOrmRepo;
  }

  async create(entity) {
    const model = this.repo.create(ResponseMapper.toPersistence(entity));
    const saved = await this.repo.save(model);
    return ResponseMapper.toDomain(saved);
  }

  async update(id, data) {
    await this.repo.update(id, data);
  }

  async findByParticipantAndQuestion(participantId, questionId) {
    const res = await this.repo.findOne({
      where: {
        participant_id: participantId,
        question_id: questionId,
      },
    });

    return res ? ResponseMapper.toDomain(res) : null;
  }

  async findByParticipantAndSession(participantId, sessionId) {
    const results = await this.repo.find({
      where: {
        participant_id: participantId,
        session_id: sessionId,
      },
    });

    return results.map(ResponseMapper.toDomain);
  }

  async findByQuestionAndSession(questionId, sessionId) {
    const results = await this.repo.find({
      where: {
        question_id: questionId,
        session_id: sessionId,
      },
    });

    return results.map(ResponseMapper.toDomain);
  }

  async findBySession(sessionId) {
    const results = await this.repo.find({
      where: {
        session_id: sessionId,
      },
    });

    return results.map(ResponseMapper.toDomain);
  }

  async findByParticipant(participantId) {
    const results = await this.repo.find({
      where: { participant_id: participantId },
    });

    return results.map(ResponseMapper.toDomain);
  }

  async deleteBySessionId(sessionId) {
    await this.repo.delete({ session_id: sessionId });
  }
}
