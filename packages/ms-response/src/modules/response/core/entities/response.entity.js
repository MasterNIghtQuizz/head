export class ResponseEntity {
  /**
   * @param {import('common-contracts').ResponseProps} props
   */
  constructor({
    id,
    participantId,
    questionId,
    sessionId,
    choiceId,
    isCorrect,
    submittedAt,
  }) {
    /** @type {string | undefined} */
    this.id = id;
    /** @type {string} */
    this.participantId = participantId;
    /** @type {string} */
    this.questionId = questionId;
    /** @type {string} */
    this.sessionId = sessionId;
    /** @type {string | null} */
    this.choiceId = choiceId;
    /** @type {boolean | null} */
    this.isCorrect = isCorrect;
    /** @type {Date} */
    this.submittedAt = submittedAt;
  }

  /**
   * @param {{ isCorrect?: boolean | null }} data
   * @returns {void}
   */
  update(data) {
    if (data.isCorrect !== undefined) {
      this.isCorrect = data.isCorrect;
    }
  }
}
