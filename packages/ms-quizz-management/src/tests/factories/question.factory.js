import { Question } from "../../modules/quiz/models/question.model.js";

/**
 * @param {Partial<Question>} overrides
 * @returns {Question}
 */
export const createQuestionMock = (overrides = {}) => {
  const question = new Question({
    id: "9f8e7d6c-5b4a-3210-9f8e-7d6c5b4a3210",
    label: "What is the capital of France?",
    type: "MCQ",
    order_index: 0,
    timer_seconds: 30,
    ...overrides,
  });
  return question;
};
