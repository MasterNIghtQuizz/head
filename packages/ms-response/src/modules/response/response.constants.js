/**
 * @typedef {'ALREADY_ANSWERED' | 'QUIZ_SERVICE_ERROR' | 'DB_ERROR' | 'QUIZ_NOT_FOUND' | 'QUESTION_NOT_FOUND' | 'CHOICE_NOT_FOUND'} ResponseErrorCode
 */

/** @type {Readonly<Record<ResponseErrorCode, string>>} */
export const ResponseError = Object.freeze({
  ALREADY_ANSWERED: "ALREADY_ANSWERED",
  QUIZ_SERVICE_ERROR: "QUIZ_SERVICE_ERROR",
  DB_ERROR: "DB_ERROR",
  QUIZ_NOT_FOUND: "QUIZ_NOT_FOUND",
  QUESTION_NOT_FOUND: "QUESTION_NOT_FOUND",
  CHOICE_NOT_FOUND: "CHOICE_NOT_FOUND",
});

/** @type {Record<string, string>} */
export const ResponseErrorMessage = {
  [ResponseError.ALREADY_ANSWERED]:
    "Participant already answered this question",
  [ResponseError.QUIZ_SERVICE_ERROR]:
    "Failed to validate answer with quiz service",
  [ResponseError.DB_ERROR]: "Database error",
  [ResponseError.QUIZ_NOT_FOUND]: "Quiz not found",
  [ResponseError.QUESTION_NOT_FOUND]: "Question not found",
  [ResponseError.CHOICE_NOT_FOUND]: "Choice not found",
  DEFAULT: "Internal server error",
};

/** @type {Record<string, number>} */
export const ResponseErrorStatus = {
  [ResponseError.ALREADY_ANSWERED]: 409,
  [ResponseError.QUIZ_SERVICE_ERROR]: 502,
  [ResponseError.DB_ERROR]: 500,
  [ResponseError.QUIZ_NOT_FOUND]: 404,
  [ResponseError.QUESTION_NOT_FOUND]: 404,
  [ResponseError.CHOICE_NOT_FOUND]: 404,
};
