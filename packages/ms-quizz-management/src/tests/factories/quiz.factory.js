import { Quiz } from "../../modules/quiz/models/quiz.model.js";

/**
 * @param {Partial<Quiz>} overrides
 * @returns {Quiz}
 */
export const createQuizMock = (overrides = {}) => {
  const quiz = new Quiz({
    id: "3368294a-8f35-430c-ab23-1f19f6880da3",
    title: "General Knowledge",
    description: "A quiz about everything",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return quiz;
};
