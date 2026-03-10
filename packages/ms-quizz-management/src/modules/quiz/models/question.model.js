export class Question {
  /** @type {string | undefined} */
  id;

  /** @type {string} */
  label = "";

  /** @type {string} */
  type = "";

  /** @type {number} */
  order_index = 0;

  /** @type {number} */
  timer_seconds = 0;

  /** @type {import('./quiz.model.js').Quiz | undefined} */
  quiz;

  /** @type {import('./choice.model.js').Choice[]} */
  choices = [];

  /**
   * @param {Partial<Question>} [data]
   */
  constructor(data) {
    if (data) {
      this.id = data.id;
      this.label = data.label ?? this.label;
      this.type = data.type ?? this.type;
      this.order_index = data.order_index ?? this.order_index;
      this.timer_seconds = data.timer_seconds ?? this.timer_seconds;
      this.quiz = data.quiz;
      this.choices = data.choices ?? this.choices;
    }
  }

  /**
   * @param {Object} raw
   * @returns {Question}
   */
  static fromRaw(raw) {
    return new Question(raw);
  }
}
