import {
  NotFoundError,
  ConflictError,
  InternalServerError,
  BadRequestError,
} from "common-errors";

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
