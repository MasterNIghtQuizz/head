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
export const UserEventTypes = {
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
};

export const ResponseEventTypes = {
  ANSWER_SUBMITTED: "ANSWER_SUBMITTED",
};

/**
 * Event Types corresponding to specific Session Events.
 */
export const SessionEventTypes = {
  SESSION_CREATED: "session-created",
  SESSION_STARTED: "session-started",
  SESSION_NEXT_QUESTION: "session-next-question",
  SESSION_ENDED: "session-ended",
  SESSION_DELETED: "session-deleted",
  PARTICIPANT_JOINED: "participant-joined",
  PARTICIPANT_LEFT: "participant-left",
  QUIZ_RESPONSE_SUBMITTED: "quiz.response.submitted",
};

/**
 * @typedef {Object} UserCreatedEventPayload
 * @property {string} userId
 * @property {string} email
 * @property {string} role
 */

/**
 * @typedef {Object} UserEventMessage
 * @property {string} eventId
 * @property {string} eventType - e.g. UserEventTypes.USER_CREATED
 * @property {UserCreatedEventPayload} payload
 * @property {number} timestamp
 */
