/**
 * @typedef {import('common-contracts').FullQuizResponse} FullQuizResponse
 */

/**
 * @implements {FullQuizResponse}
 */
export class FullQuizResponseDto {
  /**
   * @param {FullQuizResponse} data
   */
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.questions = data.questions;
  }
}

export const FullQuizResponseSchema = {
  $id: "FullQuizResponseDto",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    description: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    questions: {
      type: "array",
      items: { $ref: "FullQuestionResponseDto#" },
    },
  },
  required: ["id", "title", "createdAt", "updatedAt"],
};
