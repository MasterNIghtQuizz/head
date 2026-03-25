export const SessionStatus = Object.freeze({
  CREATED: "created",
  LOBBY: "lobby",
  QUESTION_ACTIVE: "question_active",
  QUESTION_CLOSED: "question_closed",
  FINISHED: "finished",
});

/**
 * @typedef {typeof SessionStatus[keyof typeof SessionStatus]} SessionStatus
 */
