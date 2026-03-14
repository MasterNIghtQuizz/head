import { QuestionEntity } from "../../modules/quiz/core/entities/question.entity.js";

/**
 * @param {Partial<QuestionEntity>} overrides
 * @returns {QuestionEntity}
 */
export const createQuestionMock = (overrides = {}) => {
  return new QuestionEntity({
    id: "4478294a-8f35-430c-ab23-1f19f6880da3",
    label: "What is the capital of France?",
    type: "MULTIPLE_CHOICE",
    order_index: 0,
    timer_seconds: 30,
    quizId: "3368294a-8f35-430c-ab23-1f19f6880da3",
    choices: [],
    ...overrides,
  });
};
