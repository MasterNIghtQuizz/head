export class ChoiceEntity {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} params.text
   * @param {boolean} params.is_correct
   * @param {string} [params.questionId]
   */
  constructor({ id, text, is_correct, questionId }) {
    this.id = id;
    this.text = text;
    this.is_correct = is_correct;
    this.questionId = questionId;
  }

  /**
   * @param {Partial<ChoiceEntity>} data
   */
  update(data) {
    if (data.text !== undefined) {
      this.text = data.text;
    }
    if (data.is_correct !== undefined) {
      this.is_correct = data.is_correct;
    }
  }
}
