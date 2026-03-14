import { QuizEntity } from "../../modules/quiz/core/entities/quiz.entity.js";
import { QuestionEntity } from "../../modules/quiz/core/entities/question.entity.js";
import { ChoiceEntity } from "../../modules/quiz/core/entities/choice.entity.js";
import { QuizModel } from "../../modules/quiz/infra/models/quiz.model.js";
import { QuestionModel } from "../../modules/quiz/infra/models/question.model.js";
import { ChoiceModel } from "../../modules/quiz/infra/models/choice.model.js";

/**
 * @param {Partial<QuizEntity>} [overrides]
 * @returns {QuizEntity}
 */
export const createQuizEntity = (overrides = {}) => {
  return new QuizEntity({
    id: "quiz-1",
    title: "Test Quiz",
    description: "Description",
    createdAt: new Date(),
    updatedAt: new Date(),
    questions: [],
    ...overrides,
  });
};

/**
 * @param {Partial<QuestionEntity>} [overrides]
 * @returns {QuestionEntity}
 */
export const createQuestionEntity = (overrides = {}) => {
  return new QuestionEntity({
    id: "question-1",
    label: "Test Question",
    type: "MULTIPLE_CHOICE",
    order_index: 1,
    timer_seconds: 30,
    quizId: "quiz-1",
    choices: [],
    ...overrides,
  });
};

/**
 * @param {Partial<ChoiceEntity>} [overrides]
 * @returns {ChoiceEntity}
 */
export const createChoiceEntity = (overrides = {}) => {
  return new ChoiceEntity({
    id: "choice-1",
    text: "Test Choice",
    is_correct: false,
    questionId: "question-1",
    ...overrides,
  });
};

/**
 * @param {Partial<QuizModel>} [overrides]
 * @returns {QuizModel}
 */
export const createQuizModel = (overrides = {}) => {
  const model = new QuizModel();
  model.id = "quiz-1";
  model.title = "Test Quiz";
  model.description = "Description";
  model.createdAt = new Date();
  model.updatedAt = new Date();
  Object.assign(model, overrides);
  return model;
};

/**
 * @param {Partial<QuestionModel>} [overrides]
 * @returns {QuestionModel}
 */
export const createQuestionModel = (overrides = {}) => {
  const model = new QuestionModel();
  model.id = "question-1";
  model.label = "Test Question";
  model.type = "MULTIPLE_CHOICE";
  model.order_index = 1;
  model.timer_seconds = 30;
  model.quiz_id = "quiz-1";
  Object.assign(model, overrides);
  return model;
};

/**
 * @param {Partial<ChoiceModel>} [overrides]
 * @returns {ChoiceModel}
 */
export const createChoiceModel = (overrides = {}) => {
  const model = new ChoiceModel();
  model.id = "choice-1";
  model.text = "Test Choice";
  model.is_correct = false;
  model.question_id = "question-1";
  Object.assign(model, overrides);
  return model;
};
