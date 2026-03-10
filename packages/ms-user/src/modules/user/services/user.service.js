import { BaseService } from "common-core";
import { Topics, UserEventTypes } from "common-contracts";
import logger from "common-logger";
import crypto from "node:crypto";

export class UserService extends BaseService {
  /**
   * @param {import('common-kafka').KafkaProducer} kafkaProducer
   */
  constructor(kafkaProducer) {
    super();
    this.kafkaProducer = kafkaProducer;
  }

  /**
   * @returns {import('common-contracts').HealthCheckResponseDto}
   */
  checkHealth() {
    return { ok: true };
  }

  /**
   * @param {{ email: string, role: string }} userData
   */
  async register(userData) {
    logger.info({ userData }, "Creating new user in database...");

    const userId = "user-" + Date.now();

    const payload = {
      eventId: crypto.randomUUID(),
      eventType: UserEventTypes.USER_CREATED,
      timestamp: Date.now(),
      payload: {
        userId,
        email: userData.email,
        role: userData.role,
      },
    };

    await this.kafkaProducer.publish(Topics.USER_EVENTS, payload);
    logger.info({ userId }, "User Created and Event published");

    return { userId, ...userData };
  }
}
