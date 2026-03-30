import Joi from "joi";

/**
 * @typedef {import('common-contracts').QuizResponse} QuizResponse
 */

/**
 * @implements {QuizResponse}
 */
export class QuizResponseDto {
  /**
   * @param {QuizResponse} data
   */
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export const QuizResponseSchema = {
  $id: "QuizResponseDto",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    description: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    questions: {
      type: "array",
      items: { $ref: "QuestionResponseDto#" },
    },
  },
  required: ["id", "title", "createdAt", "updatedAt"],
};
