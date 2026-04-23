import Joi from "joi";

/**
 * @typedef {import('common-contracts').CreateQuestionRequest} CreateQuestionRequest
 * @typedef {import('common-contracts').UpdateQuestionRequest} UpdateQuestionRequest
 * @typedef {import('common-contracts').QuestionResponse} QuestionResponse
 */

/**
 * @implements {CreateQuestionRequest}
 */
export class CreateQuestionRequestDto {
  /**
   * @param {CreateQuestionRequest} data
   */
  constructor(data) {
    this.label = data.label;
    this.type = data.type;
    this.order_index = data.order_index;
    this.timer_seconds = data.timer_seconds;
    this.quiz_id = data.quiz_id;
  }

  /**
   * @param {CreateQuestionRequest} data
   * @returns {import('joi').ValidationResult<CreateQuestionRequest>}
   */
  static validate(data) {
    const schema = Joi.object({
      label: Joi.string().required(),
      type: Joi.string().required(),
      order_index: Joi.number().integer().required(),
      timer_seconds: Joi.number().integer().required(),
      quiz_id: Joi.string().uuid().required(),
    });
    return schema.validate(data);
  }
}

/**
 * @implements {UpdateQuestionRequest}
 */
export class UpdateQuestionRequestDto {
  /**
   * @param {UpdateQuestionRequest} data
   */
  constructor(data) {
    this.label = data.label;
    this.type = data.type;
    this.order_index = data.order_index;
    this.timer_seconds = data.timer_seconds;
  }

  /**
   * @param {UpdateQuestionRequest} data
   * @returns {import('joi').ValidationResult<UpdateQuestionRequest>}
   */
  static validate(data) {
    const schema = Joi.object({
      label: Joi.string().optional(),
      type: Joi.string().optional(),
      order_index: Joi.number().integer().optional(),
      timer_seconds: Joi.number().integer().optional(),
    }).min(1);
    return schema.validate(data);
  }
}

/**
 * @implements {QuestionResponse}
 */
export class QuestionResponseDto {
  /**
   * @param {QuestionResponse} data
   */
  constructor(data) {
    this.id = data.id;
    this.label = data.label;
    this.type = data.type;
    this.order_index = data.order_index;
    this.timer_seconds = data.timer_seconds;
    this.choices = data.choices || [];
  }
}

export const QuestionResponseSchema = {
  $id: "QuestionResponseDto",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    label: { type: "string" },
    type: { type: "string" },
    order_index: { type: "integer" },
    timer_seconds: { type: "integer" },
    choices: {
      type: "array",
      items: { $ref: "../contracts/choice.dto.js#/ChoiceResponseDto" },
    },
  },
  required: ["id", "label", "type", "order_index", "timer_seconds"],
};
