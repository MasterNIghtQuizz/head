import { NotFoundError, ConflictError } from "common-errors";

/** @param {string} id */
export const QUESTION_NOT_FOUND = (id) =>
  new NotFoundError(`Question with id ${id} not found`, {
    entity: "Question",
    id,
  });

/** @param {string} identifier */
export const QUESTION_CONFLICT = (identifier) =>
  new ConflictError(`Question already exists with identifier: ${identifier}`, {
    entity: "Question",
    identifier,
  });
