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
