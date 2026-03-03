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
