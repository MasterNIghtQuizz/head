export class ResponseRepository {
  create(response) {
    throw new Error("Not implemented");
  }

  update(id, data) {
    throw new Error("Not implemented");
  }

  findByParticipantAndQuestion(participantId, questionId) {
    throw new Error("Not implemented");
  }

  findByParticipantAndSession(participantId, sessionId) {
    throw new Error("Not implemented");
  }

  findByQuestionAndSession(questionId, sessionId) {
    throw new Error("Not implemented");
  }

  findBySession(sessionId) {
    throw new Error("Not implemented");
  }

  findByParticipant(participantId) {
    throw new Error("Not implemented");
  }

  deleteBySessionId(sessionId) {
    throw new Error("Not implemented");
  }
}
