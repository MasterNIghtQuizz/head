import { NotFoundError, ConflictError } from "common-errors";

/** @param {string} id */
export const QUIZ_NOT_FOUND = (id) =>
  new NotFoundError(`Quiz with id ${id} not found`, { entity: "Quiz", id });

/** @param {string} identifier */
export const QUIZ_CONFLICT = (identifier) =>
  new ConflictError(`Quiz already exists with identifier: ${identifier}`, {
    entity: "Quiz",
    identifier,
  });
