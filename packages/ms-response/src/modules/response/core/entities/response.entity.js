export class ResponseEntity {
  constructor({
    id,
    participantId,
    questionId,
    sessionId,
    choiceId,
    isCorrect,
    submittedAt,
  }) {
    this.id = id;
    this.participantId = participantId;
    this.questionId = questionId;
    this.sessionId = sessionId;
    this.choiceId = choiceId;
    this.isCorrect = isCorrect;
    this.submittedAt = submittedAt;
  }

  update(data) {
    if (data.isCorrect !== undefined) {
      this.isCorrect = data.isCorrect;
    }
  }
}
