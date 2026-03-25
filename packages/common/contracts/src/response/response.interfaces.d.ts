export interface AnswerSubmittedEventPayload {
  participantId: string;
  questionId: string;
  sessionId: string;
  latencyMs: number;
  choiceId?: string;
  is_correct?: boolean;
}

export interface SessionStartedEventPayload {
  sessionId: string;
  quizzId: string;
}

export interface SessionEndedEventPayload {
  sessionId: string;
}
