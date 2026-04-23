import Joi from "joi";

/**
 * @typedef {import("common-contracts").CreateSessionRequest} CreateSessionRequest
 * @typedef {import("common-contracts").CreateSessionResponse} CreateSessionResponse
 * @typedef {import("common-contracts").JoinSessionRequest} JoinSessionRequest
 * @typedef {import("common-contracts").JoinSessionResponse} JoinSessionResponse
 * @typedef {import("common-contracts").LeaveSessionRequest} LeaveSessionRequest
 * @typedef {import("common-contracts").GetSessionResponse} GetSessionResponse
 * @typedef {import("common-contracts").GetCurrentQuestionResponse} GetCurrentQuestionResponse
 * @typedef {import("common-contracts").Participant} Participant
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
  }

  /**
   * @param {CreateSessionRequest} data
   * @returns {Joi.ValidationResult}
   */
  static validate(data) {
    const schema = Joi.object({
      quiz_id: Joi.string().required(),
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
    this.game_token = data.game_token;
  }
}

/**
 * @implements {JoinSessionRequest}
 */
export class JoinSessionRequestDto {
  /**
   * @param {JoinSessionRequest} data
   */
  constructor(data) {
    this.session_public_key = data.session_public_key;
    this.participant_nickname = data.participant_nickname;
  }

  /**
   * @param {JoinSessionRequest} data
   * @returns {Joi.ValidationResult}
   */
  static validate(data) {
    const schema = Joi.object({
      session_public_key: Joi.string().required(),
      participant_nickname: Joi.string().required(),
    });
    return schema.validate(data);
  }
}

/**
 * @implements {JoinSessionResponse}
 */
export class JoinSessionResponseDto {
  /**
   * @param {JoinSessionResponse} data
   */
  constructor(data) {
    this.participant_id = data.participant_id;
    this.game_token = data.game_token;
  }
}

/**
 * @implements {LeaveSessionRequest}
 */
export class LeaveSessionRequestDto {
  /**
   * @param {LeaveSessionRequest} data
   */
  static validate(data) {
    return Joi.object({}).validate(data);
  }
}

/**
 * @implements {GetSessionResponse}
 */
export class GetSessionResponseDto {
  /**
   * @param {GetSessionResponse} data
   */
  constructor(data) {
    this.session_id = data.session_id;
    this.public_key = data.public_key;
    this.status = data.status;
    this.current_question_id = data.current_question_id;
    this.quizz_id = data.quizz_id;
    this.host_id = data.host_id;
    this.participants = data.participants;
  }
}

/**
 * @implements {GetCurrentQuestionResponse}
 */
export class GetCurrentQuestionResponseDto {
  /**
   * @param {GetCurrentQuestionResponse} data
   */
  constructor(data) {
    this.question_id = data.question_id;
    this.label = data.label;
    this.type = data.type;
    this.timer_seconds = data.timer_seconds;
    this.choices = data.choices;
    this.current_buzzer = data.current_buzzer;
  }
}

/**
 * @implements {Participant}
 */
export class ParticipantDto {
  /**
   * @param {Participant} data
   */
  constructor(data) {
    this.participant_id = data.participant_id;
    this.nickname = data.nickname;
    this.role = data.role;
  }
}
