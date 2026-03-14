export class QuizEntity {
  /**
   * @param {Object} params
   * @param {string} [params.id]
   * @param {string} params.title
   * @param {string} [params.description]
   * @param {Date} [params.createdAt]
   * @param {Date} [params.updatedAt]
   * @param {import('./question.entity.js').QuestionEntity[]} [params.questions]
   */
  constructor({ id, title, description, createdAt, updatedAt, questions }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.questions = questions || [];
  }

  /**
   * @param {Partial<QuizEntity>} data
   */
  update(data) {
    if (data.title !== undefined) {
      this.title = data.title;
    }
    if (data.description !== undefined) {
      this.description = data.description;
    }
  }
}
