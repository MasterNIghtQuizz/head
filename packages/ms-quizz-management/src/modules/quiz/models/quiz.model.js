export class Quiz {
  /** @type {string | undefined} */
  id;

  /** @type {string} */
  title = "";

  /** @type {string | undefined} */
  description;

  /** @type {Date | undefined} */
  createdAt;

  /** @type {Date | undefined} */
  updatedAt;

  /** @type {import('./question.model.js').Question[]} */
  questions = [];

  /**
   * @param {Partial<Quiz>} [data]
   */
  constructor(data) {
    if (data) {
      this.id = data.id;
      this.title = data.title ?? this.title;
      this.description = data.description;
      this.createdAt = data.createdAt;
      this.updatedAt = data.updatedAt;
      this.questions = data.questions ?? this.questions;
    }
  }

  /**
   * @param {Object} raw
   * @returns {Quiz}
   */
  static fromRaw(raw) {
    return new Quiz(raw);
  }
}
