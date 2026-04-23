import { ResponseEntity } from "../../core/entities/response.entity.js";

const DEFAULT_ID = "69c16aed-ec7c-8328-baf4-4edc49890471";
const DEFAULT_PARTICIPANT = "69c16aed-ec7c-8328-baf4-4edc49890472";
const DEFAULT_QUESTION = "69c16aed-ec7c-8328-baf4-4edc49890473";
const DEFAULT_SESSION = "69c16aed-ec7c-8328-baf4-4edc49890474";
const DEFAULT_CHOICE = "69c16aed-ec7c-8328-baf4-4edc49890475";

/**
 * @param {Partial<import('common-contracts').Response>} [overrides]
 * @returns {ResponseEntity}
 */
export function createResponseEntity(overrides = {}) {
  return new ResponseEntity({
    id: DEFAULT_ID,
    participantId: DEFAULT_PARTICIPANT,
    questionId: DEFAULT_QUESTION,
    sessionId: DEFAULT_SESSION,
    choiceId: DEFAULT_CHOICE,
    isCorrect: true,
    submittedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

/**
 * @typedef {Object} ResponseModelFixture
 * @property {string} id
 * @property {string} participant_id
 * @property {string} question_id
 * @property {string} session_id
 * @property {string | null} choice_id
 * @property {boolean | null} is_correct
 * @property {Date} submitted_at
 */

/**
 * @param {Partial<ResponseModelFixture>} [overrides]
 * @returns {ResponseModelFixture}
 */
export function createResponseModel(overrides = {}) {
  return {
    id: DEFAULT_ID,
    participant_id: DEFAULT_PARTICIPANT,
    question_id: DEFAULT_QUESTION,
    session_id: DEFAULT_SESSION,
    choice_id: DEFAULT_CHOICE,
    is_correct: true,
    submitted_at: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

/**
 * @param {Partial<import('common-contracts').AnswerEvent>} [overrides]
 * @returns {import('common-contracts').AnswerEvent}
 */
export function createAnswerEvent(overrides = {}) {
  return {
    participantId: DEFAULT_PARTICIPANT,
    sessionId: DEFAULT_SESSION,
    choiceId: DEFAULT_CHOICE,
    latencyMs: 500,
    ...overrides,
  };
}

/**
 * @typedef {Object} QuizPayloadFixture
 * @property {string} id
 * @property {string} title
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {{ id: string, label: string, type: string, order_index: number, timer_seconds: number, choices: { id: string, text: string, is_correct: boolean }[] }[]} questions
 */

/**
 * @param {Partial<QuizPayloadFixture>} [overrides]
 * @returns {QuizPayloadFixture}
 */
export function createQuizPayload(overrides = {}) {
  return {
    id: "quiz-1",
    title: "Sample Quiz",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    questions: [
      {
        id: DEFAULT_QUESTION,
        label: "Sample Question",
        type: "MCQ",
        order_index: 0,
        timer_seconds: 30,
        choices: [
          {
            id: DEFAULT_CHOICE,
            text: "Correct Choice",
            is_correct: true,
          },
          {
            id: "wrong-choice-id",
            text: "Wrong Choice",
            is_correct: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}
