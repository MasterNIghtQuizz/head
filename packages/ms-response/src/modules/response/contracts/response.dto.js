import Joi from "joi";

/**
 * DTO pour soumettre une réponse
 */
export class CreateResponseRequestDto {
  /**
   * @param {any} data
   */
  constructor(data) {
    this.participantId = data.participantId;
    this.questionId = data.questionId;
    this.sessionId = data.sessionId;
    this.choice_id = data.choice_id ?? null;
    this.is_correct = data.is_correct ?? null;
    this.latencyMs = data.latencyMs;
  }

  /**
   * Validation conditionnelle :
   * - soit choice_id (QCM)
   * - soit is_correct (BUZZER)
   */
  static validate(data) {
    const schema = Joi.object({
      participantId: Joi.string().uuid().required(),
      questionId: Joi.string().uuid().required(),
      sessionId: Joi.string().uuid().required(),
      latencyMs: Joi.number().integer().min(0).required(),

      choice_id: Joi.string().uuid().optional(),
      is_correct: Joi.boolean().optional(),
    })
      .xor("choice_id", "is_correct")
      .messages({
        "object.xor":
          "You must provide either choice_id (QCM) or is_correct (buzzer), but not both",
      });

    return schema.validate(data);
  }
}
