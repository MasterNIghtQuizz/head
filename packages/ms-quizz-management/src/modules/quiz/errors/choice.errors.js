import { NotFoundError, ConflictError } from "common-errors";

/** @param {string} id */
export const CHOICE_NOT_FOUND = (id) =>
  new NotFoundError(`Choice with id ${id} not found`, { entity: "Choice", id });

/** @param {string} identifier */
export const CHOICE_CONFLICT = (identifier) =>
  new ConflictError(`Choice already exists with identifier: ${identifier}`, {
    entity: "Choice",
    identifier,
  });
