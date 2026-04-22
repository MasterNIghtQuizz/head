import { NotFoundError, ConflictError, BadRequestError } from "common-errors";

/** @param {string} [id] */
export const SESSION_INVALID_STATUS = (id) =>
  new ConflictError(`Session with id ${id} is not in a valid status`);

/** @param {string} [id] */
export const SESSION_NOT_FOUND = (id) =>
  new NotFoundError(`Session with id ${id} not found`);

/** @param {string|null} [id] */
export const QUIZZ_NOT_FOUND = (id) =>
  new NotFoundError(`Quizz with id ${id} not found`);

/** @param {string|null} [id] */
export const EMPTY_QUIZZ = (id) =>
  new BadRequestError(`Quizz with id ${id} has no questions`);

export const QUESTION_TIMED_OUT = () =>
  new BadRequestError("Question has timed out");

/** @param {string} choiceId */
export const INVALID_CHOICE = (choiceId) =>
  new BadRequestError(
    `Choice with id ${choiceId} is not valid for this question`,
  );

export const MISSING_CHOICE_IDS = () =>
  new BadRequestError("Missing choiceIds for this question type");

/** @param {string[]} ids */
/** @param {string[]} ids */
export const INVALID_CHOICE_IDS = (ids) =>
  new BadRequestError(`Invalid choiceIds submitted: ${ids.join(", ")}`);

/** @param {string} participantId @param {string} questionId */
export const ALREADY_RESPONDED = (participantId, questionId) =>
  new ConflictError(
    `Participant ${participantId} already responded to question ${questionId}`,
  );

/** @param {string} sessionId */
export const NO_BUZZER_FOUND = (sessionId) =>
  new BadRequestError(`No participant found in buzzer queue for session ${sessionId}`);
