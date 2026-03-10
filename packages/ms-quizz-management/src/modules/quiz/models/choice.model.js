export class Choice {
  /** @type {string | undefined} */
  id;

  /** @type {string} */
  text = "";

  /** @type {boolean} */
  is_correct = false;

  /** @type {import('./question.model.js').Question | undefined} */
  question;

  /**
   * @param {Partial<Choice>} [data]
   */
  constructor(data) {
    if (data) {
      this.id = data.id;
      this.text = data.text ?? this.text;
      this.is_correct = data.is_correct ?? this.is_correct;
      this.question = data.question;
    }
  }

  /**
   * @param {Object} raw
   * @returns {Choice}
   */
  static fromRaw(raw) {
    return new Choice(raw);
  }
}
