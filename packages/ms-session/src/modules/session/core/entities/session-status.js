export const SessionStatus = Object.freeze({
  CREATED: "created",
  LOBBY: "lobby",
  STARTING: "starting",
  QUESTION_ACTIVE: "question_active",
  QUESTION_CLOSED: "question_closed",
  FINISHED: "finished",
});

/**
 * @typedef {typeof SessionStatus[keyof typeof SessionStatus]} SessionStatus
 */
