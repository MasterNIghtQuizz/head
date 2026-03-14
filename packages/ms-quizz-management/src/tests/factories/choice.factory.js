import { ChoiceEntity } from "../../modules/quiz/core/entities/choice.entity.js";

/**
 * @param {Partial<ChoiceEntity>} overrides
 * @returns {ChoiceEntity}
 */
export const createChoiceMock = (overrides = {}) => {
  return new ChoiceEntity({
    id: "5588294a-8f35-430c-ab23-1f19f6880da3",
    text: "Paris",
    is_correct: true,
    questionId: "4478294a-8f35-430c-ab23-1f19f6880da3",
    ...overrides,
  });
};
