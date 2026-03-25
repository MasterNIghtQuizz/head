export * from "./src/quiz/quiz.interfaces.js";
export * from "./src/quiz/question.interfaces.js";
export * from "./src/quiz/choice.interfaces.js";
export * from "./src/session/session.interfaces.js";
export * from "./src/session/participant.interfaces.js";
export * from "./src/user/user.interfaces.js";

export interface HealthCheckResponseDto {
  ok: boolean;
}

export const Topics: {
  USER_EVENTS: string;
  QUIZZ_EVENTS: string;
};

export const UserEventTypes: {
  USER_CREATED: string;
  USER_UPDATED: string;
  USER_DELETED: string;
};

export interface UserCreatedEventPayload {
  userId: string;
  email: string;
  role: string;
}

export interface UserEventMessage {
  eventId: string;
  eventType: string;
  payload: UserCreatedEventPayload;
  timestamp: number;
}

export const QuestionType: {
  SINGLE: "single";
  MULTIPLE: "multiple";
  BUZZER: "buzzer";
};

export const SessionStatus: {
  CREATED: "CREATED";
  LOBBY: "LOBBY";
  QUESTION_ACTIVE: "QUESTION_ACTIVE";
  QUESTION_CLOSED: "QUESTION_CLOSED";
  FINISHED: "FINISHED";
};

export const ParticipantRoles: {
  HOST: "HOST";
  PLAYER: "PLAYER";
};

export const ResponseEventTypes: {
  ANSWER_SUBMITTED: string;
  SESSION_ENDED: string;
};
