import { call } from "common-axios";

export class QuizClient {
  async getChoice(choiceId) {
    return await call({
      url: `/choices/${choiceId}`,
      method: "GET",
    });
  }
}
