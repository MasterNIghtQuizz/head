import {
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "common-errors";

/**
 * @param {string} [id]
 */
export const USER_NOT_FOUND = (id) =>
  new NotFoundError(`User with id ${id} not found`);

/**
 * @param {string} [email]
 */
export const USER_CONFLICT = (email) =>
  new ConflictError(`User with email ${email} already exists`);

/** @param {Error} originalError */
export const DATABASE_ERROR = (originalError) =>
  new InternalServerError(
    `Database operation failed: ${originalError.message}`,
    {
      originalError,
    },
  );
