import { InternalServerError } from "common-errors";

/** @param {Error} originalError */
export const DATABASE_ERROR = (originalError) =>
  new InternalServerError(
    `Database operation failed: ${originalError.message}`,
    {
      originalError,
    },
  );
