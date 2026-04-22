/**
 * Global Kafka event topics used across microservices.
 */
export const Topics = {
  USER_EVENTS: "user.events",
  QUIZZ_EVENTS: "quizz.events",
};

/**
 * Event Types corresponding to specific Domain Events.
 */
export const UserEventTypes = /** @type {const} */ ({
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
});

export const ResponseEventTypes = /** @type {const} */ ({
  ANSWER_SUBMITTED: "ANSWER_SUBMITTED",
});

/**
 * Event Types corresponding to specific Session Events.
 */
export const SessionEventTypes = /** @type {const} */ ({
  SESSION_CREATED: "session-created",
  SESSION_STARTED: "session-started",
  SESSION_NEXT_QUESTION: "session-next-question",
  SESSION_ENDED: "session-ended",
  SESSION_DELETED: "session-deleted",
  PARTICIPANT_JOINED: "participant-joined",
  PARTICIPANT_LEFT: "participant-left",
  QUIZ_RESPONSE_SUBMITTED: "quiz.response.submitted",
  USER_PRESSED_BUZZER: "user-pressed-buzzer",
  BUZZER_NEXT_PLAYER: "buzzer-next-player",
  BUZZER_RESPONSE_VALIDATED: "buzzer-response-validated",
  SESSION_QUESTION_RESOLVED: "session-question-resolved",
  FEED_BUZZER_QUEUE: "feed-buzzer-queue",
  BUZZER_ANSWER_SUBMITTED: "buzzer-answer-submitted",
  PING_HOST_FOR_QUEUE: "ping-host-for-queue",
});

/**
 * @typedef {import('./events.interfaces.js').KafkaEvent} KafkaEvent
 */
