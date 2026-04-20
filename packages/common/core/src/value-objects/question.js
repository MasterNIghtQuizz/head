import { Choice } from "./choice.js";

export class Question {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.label
   * @param {string} props.type
   * @param {number} props.order_index
   * @param {number} props.timer_seconds
   * @param {Choice[]} [props.choices]
   */
  constructor({ id, label, type, order_index, timer_seconds, choices }) {
    this.id = id;
    this.label = label;
    this.type = type;
    this.order_index = order_index;
    this.timer_seconds = timer_seconds;
    this.choices = (choices || []).map((c) =>
      c instanceof Choice ? c : new Choice(c),
    );
    Object.freeze(this);
  }
}
