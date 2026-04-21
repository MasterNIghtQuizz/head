export class ResponseRepository {
  /**
   * @param {import('../entities/response.entity.js').ResponseEntity} _response
   * @returns {Promise<import('../entities/response.entity.js').ResponseEntity>}
   */
  create(_response) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _id
   * @param {import('../entities/response.entity.js').ResponseEntity} _data
   * @returns {Promise<void>}
   */
  update(_id, _data) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _participantId
   * @param {string} _questionId
   * @returns {Promise<import('../entities/response.entity.js').ResponseEntity|null>}
   */
  findByParticipantAndQuestion(_participantId, _questionId) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _participantId
   * @param {string} _sessionId
   * @returns {Promise<import('../entities/response.entity.js').ResponseEntity[]>}
   */
  findByParticipantAndSession(_participantId, _sessionId) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _questionId
   * @param {string} _sessionId
   * @returns {Promise<import('../entities/response.entity.js').ResponseEntity[]>}
   */
  findByQuestionAndSession(_questionId, _sessionId) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _sessionId
   * @returns {Promise<import('../entities/response.entity.js').ResponseEntity[]>}
   */
  findBySession(_sessionId) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _participantId
   * @returns {Promise<import('../entities/response.entity.js').ResponseEntity[]>}
   */
  findByParticipant(_participantId) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _sessionId
   * @returns {Promise<void>}
   */
  deleteBySessionId(_sessionId) {
    throw new Error("Not implemented");
  }
}
