import Joi from "joi";

/**
 * @typedef {import("common-contracts").CreateSessionRequest} CreateSessionRequest
 * @typedef {import("common-contracts").CreateSessionResponse} CreateSessionResponse
 */

/**
 * @implements {CreateSessionRequest}
 */
export class CreateSessionRequestDto {
  /**
   * @param {CreateSessionRequest} data
   */
  constructor(data) {
    this.quiz_id = data.quiz_id;
    this.host_id = data.host_id;
  }

  /**
   * @param {CreateSessionRequest} data
   * @returns {Joi.ValidationResult}
   */
  static validate(data) {
    const schema = Joi.object({
      quiz_id: Joi.string().required(),
      host_id: Joi.string().required(),
    });
    return schema.validate(data);
  }
}

/**
 * @implements {CreateSessionResponse}
 */
export class CreateSessionResponseDto {
  /**
   * @param {CreateSessionResponse} data
   */
  constructor(data) {
    this.session_id = data.session_id;
    this.public_key = data.public_key;
  }
}
