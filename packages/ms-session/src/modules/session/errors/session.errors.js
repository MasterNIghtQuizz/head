import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

export const SESSION_NOT_OPEN = () => new NotFoundError("Session not open");

/** @param {string} [id] */
export const SESSION_NOT_FOUND = (id) =>
  new NotFoundError(`Session with id ${id} not found`);
