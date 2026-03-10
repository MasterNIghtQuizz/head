import Joi from "joi";

/**
 * @typedef {import('common-contracts').CreateQuizRequest} CreateQuizRequest
 * @typedef {import('common-contracts').UpdateQuizRequest} UpdateQuizRequest
 * @typedef {import('common-contracts').QuizResponse} QuizResponse
 */

/**
 * @implements {CreateQuizRequest}
 */
export class CreateQuizRequestDto {
  /**
   * @param {CreateQuizRequest} data
   */
  constructor(data) {
    this.title = data.title;
    this.description = data.description;
  }

  /**
   * @param {CreateQuizRequest} data
   */
  static validate(data) {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
    });
    return schema.validate(data);
  }
}

/**
 * @implements {UpdateQuizRequest}
 */
export class UpdateQuizRequestDto {
  /**
   * @param {UpdateQuizRequest} data
   */
  constructor(data) {
    this.title = data.title;
    this.description = data.description;
  }

  /**
   * @param {UpdateQuizRequest} data
   */
  static validate(data) {
    const schema = Joi.object({
      title: Joi.string().optional(),
      description: Joi.string().optional(),
    }).min(1);
    return schema.validate(data);
  }
}

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
