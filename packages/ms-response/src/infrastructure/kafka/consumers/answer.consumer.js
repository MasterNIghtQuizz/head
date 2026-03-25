import { KafkaConsumer } from "common-kafka";
import { ResponseEventTypes } from "common-contracts";

export class AnswerConsumer extends KafkaConsumer {
  constructor(responseService, config, logger) {
    super({
      groupId: "ms-response-group",
      topic: ResponseEventTypes.ANSWER_SUBMITTED,
      brokers: config.kafka.brokers,
      logger,
    });

    this.responseService = responseService;
  }

  async handleMessage(message) {
    const event = JSON.parse(message.value.toString());

    await this.responseService.handleAnswer(event);
  }
}
