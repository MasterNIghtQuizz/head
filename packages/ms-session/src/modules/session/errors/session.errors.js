import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/** @param {string} [id] */
export const SESSION_INVALID_STATUS = (id) =>
  new ConflictError(`Session with id ${id} is not in a valid status`);

/** @param {string} [id] */
export const SESSION_NOT_FOUND = (id) =>
  new NotFoundError(`Session with id ${id} not found`);
