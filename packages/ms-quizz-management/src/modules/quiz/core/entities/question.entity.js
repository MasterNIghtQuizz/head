export class QuestionEntity {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} params.label
   * @param {string} params.type
   * @param {number} params.order_index
   * @param {number} params.timer_seconds
   * @param {string} [params.quizId]
   * @param {import('./choice.entity.js').ChoiceEntity[]} [params.choices]
   */
  constructor({
    id,
    label,
    type,
    order_index,
    timer_seconds,
    quizId,
    choices,
  }) {
    this.id = id;
    this.label = label;
    this.type = type;
    this.order_index = order_index;
    this.timer_seconds = timer_seconds;
    this.quizId = quizId;
    this.choices = choices || [];
  }

  /**
   * @param {Partial<QuestionEntity>} data
   */
  update(data) {
    if (data.label !== undefined) {
      this.label = data.label;
    }
    if (data.type !== undefined) {
      this.type = data.type;
    }
    if (data.order_index !== undefined) {
      this.order_index = data.order_index;
    }
    if (data.timer_seconds !== undefined) {
      this.timer_seconds = data.timer_seconds;
    }
  }
}
