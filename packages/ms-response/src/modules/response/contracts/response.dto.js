import Joi from "joi";

export class CreateResponseRequestDto {
  /** @type {string} */
  participantId;
  /** @type {string} */
  questionId;
  /** @type {string} */
  sessionId;
  /** @type {string|null} */
  choiceId;
  /** @type {boolean|null} */
  isCorrect;
  /** @type {number} */
  latencyMs;
  /** @type {Date} */
  submittedAt;
  /**
   * @param {import('common-contracts').CreateResponseRequest} data
   */
  constructor(data) {
    this.participantId = data.participantId;
    //this.questionId = data.questionId;
    this.sessionId = data.sessionId;
    this.choiceId = data.choiceId ?? null;
    this.isCorrect = data.isCorrect ?? null;
    this.latencyMs = data.latencyMs ?? null;
    this.submittedAt = data.submittedAt ?? new Date();
  }

  /**
   * Validation conditionnelle :
   * - soit choiceId (QCM)
   * - soit isCorrect (BUZZER)
   *
   * @param {unknown} data
   * @returns {import('joi').ValidationResult}
   */
  static validate(data) {
    const schema = Joi.object({
      participantId: Joi.string().uuid().required(),
      questionId: Joi.string().uuid().required(),
      sessionId: Joi.string().uuid().required(),
      latencyMs: Joi.number().integer().min(0).optional(),
      submittedAt: Joi.date().iso().optional(),
      choiceId: Joi.string().uuid().optional(),
      isCorrect: Joi.boolean().optional(),
    })
      .xor("choiceId", "isCorrect")
      .messages({
        "object.xor":
          "You must provide either choiceId (QCM) or isCorrect (buzzer), but not both",
      });

    return schema.validate(data);
  }
}
