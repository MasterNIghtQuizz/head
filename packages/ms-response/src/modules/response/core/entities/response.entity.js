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
    this.id = id || "";
    this.participantId = participantId || "";
    this.questionId = questionId || "";
    this.sessionId = sessionId || "";
    this.choiceId = choiceId ?? null;
    this.isCorrect = isCorrect ?? null;
    this.submittedAt = submittedAt || new Date();
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
