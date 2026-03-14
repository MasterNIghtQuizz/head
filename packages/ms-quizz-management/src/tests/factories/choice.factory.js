import { Choice } from "../../modules/quiz/models/choice.model.js";

/**
 * @param {Partial<Choice>} overrides
 * @returns {Choice}
 */
export const createChoiceMock = (overrides = {}) => {
  const choice = new Choice({
    id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    text: "Paris",
    is_correct: true,
    ...overrides,
  });
  return choice;
};
