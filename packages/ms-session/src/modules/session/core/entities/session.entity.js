export class SessionEntity {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} params.publicKey
   * @param {string} params.status
   * @param {string} params.currentQuestionId
   * @param {string} params.quizzId
   * @param {string} params.hostId
   */
  constructor({ id, publicKey, status, currentQuestionId, quizzId, hostId }) {
    this.id = id;
    this.publicKey = publicKey;
    this.status = status;
    this.currentQuestionId = currentQuestionId;
    this.quizzId = quizzId;
    this.hostId = hostId;
  }
}
