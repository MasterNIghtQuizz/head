import { UserEventTypes, SessionEventTypes, ResponseEventTypes } from "./events.js";

export interface UserCreatedEventPayload {
  userId: string;
  email: string;
  role: string;
}

export interface UserUpdatedEventPayload {
  userId: string;
  email: string;
  role: string;
}

export interface UserDeletedEventPayload {
  userId: string;
}

export interface SessionCreatedEventPayload {
  session_id: string;
  quiz_id: string;
  participant_id: string;
  nickname: string;
  role: string;
}

export interface SessionStartedEventPayload {
  session_id: string;
}

export interface SessionNextQuestionEventPayload {
  session_id: string;
  question_id: string;
}

export interface SessionEndedEventPayload {
  session_id: string;
}

export interface SessionDeletedEventPayload {
  session_id: string;
}

export interface ParticipantJoinedEventPayload {
  session_id: string;
  participant_id: string;
  nickname: string;
  role: string;
}

export interface ParticipantLeftEventPayload {
  session_id: string;
  participant_id: string;
  nickname: string;
  role: string;
}

export interface QuizResponseSubmittedEventPayload {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId: string | null;
  submittedAt: string;
  type?: string;
}


export interface AnswerSubmittedEventPayload {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceIds: string[];
  submittedAt: string;
}

export interface BaseKafkaEvent {
  eventId: string;
  timestamp: number;
}

export type KafkaEvent =
  | (BaseKafkaEvent & { eventType: typeof UserEventTypes.USER_CREATED; payload: UserCreatedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof UserEventTypes.USER_UPDATED; payload: UserUpdatedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof UserEventTypes.USER_DELETED; payload: UserDeletedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof ResponseEventTypes.ANSWER_SUBMITTED; payload: AnswerSubmittedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.SESSION_CREATED; payload: SessionCreatedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.SESSION_STARTED; payload: SessionStartedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.SESSION_NEXT_QUESTION; payload: SessionNextQuestionEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.SESSION_ENDED; payload: SessionEndedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.SESSION_DELETED; payload: SessionDeletedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.PARTICIPANT_JOINED; payload: ParticipantJoinedEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.PARTICIPANT_LEFT; payload: ParticipantLeftEventPayload })
  | (BaseKafkaEvent & { eventType: typeof SessionEventTypes.QUIZ_RESPONSE_SUBMITTED; payload: QuizResponseSubmittedEventPayload });

export interface GenericKafkaEvent<T = unknown> extends BaseKafkaEvent {
  eventType: string;
  payload: T;
}
