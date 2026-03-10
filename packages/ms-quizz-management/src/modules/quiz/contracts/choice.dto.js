import Joi from "joi";

/**
 * @typedef {import('common-contracts').CreateChoiceRequest} CreateChoiceRequest
 * @typedef {import('common-contracts').UpdateChoiceRequest} UpdateChoiceRequest
 * @typedef {import('common-contracts').ChoiceResponse} ChoiceResponse
 */

/**
 * @implements {CreateChoiceRequest}
 */
export class CreateChoiceRequestDto {
  /**
   * @param {CreateChoiceRequest} data
   */
  constructor(data) {
    this.text = data.text;
    this.is_correct = data.is_correct;
    this.question_id = data.question_id;
  }

  /**
   * @param {CreateChoiceRequest} data
   */
  static validate(data) {
    const schema = Joi.object({
      text: Joi.string().required(),
      is_correct: Joi.boolean().required(),
      question_id: Joi.string().uuid().required(),
    });
    return schema.validate(data);
  }
}

/**
 * @implements {UpdateChoiceRequest}
 */
export class UpdateChoiceRequestDto {
  /**
   * @param {UpdateChoiceRequest} data
   */
  constructor(data) {
    this.text = data.text;
    this.is_correct = data.is_correct;
  }

  /**
   * @param {UpdateChoiceRequest} data
   */
  static validate(data) {
    const schema = Joi.object({
      text: Joi.string().optional(),
      is_correct: Joi.boolean().optional(),
    }).min(1);
    return schema.validate(data);
  }
}

/**
 * @implements {ChoiceResponse}
 */
export class ChoiceResponseDto {
  /**
   * @param {ChoiceResponse} data
   */
  constructor(data) {
    this.id = data.id;
    this.text = data.text;
    this.is_correct = data.is_correct;
  }
}
