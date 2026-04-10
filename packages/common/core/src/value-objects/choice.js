export class Choice {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.text
   * @param {boolean} [props.is_correct]
   */
  constructor({ id, text, is_correct }) {
    this.id = id;
    this.text = text;
    this.is_correct = is_correct;
    Object.freeze(this);
  }
}
