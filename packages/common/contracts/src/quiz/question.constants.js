/**
 * @typedef {Object} QuestionType
 * @property {'single'} SINGLE
 * @property {'multiple'} MULTIPLE
 * @property {'buzzer'} BUZZER
 */

/** @type {Readonly<QuestionType>} */
export const QuestionType = Object.freeze({
  SINGLE: "single",
  MULTIPLE: "multiple",
  BUZZER: "buzzer",
});
