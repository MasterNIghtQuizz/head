import fp from "fastify-plugin";
import { SessionNotificationsConsumer } from "../valkey/consumers/session-notifications.consumer.js";
import { config } from "../../config.js";

/**
 * @param {import('../../types/fastify.d.ts').AppInstance} fastify
 */
async function valkeyPluginImpl(fastify) {
  if (!config.valkey || !config.valkey.enabled) {
    fastify.decorate("valkeyConsumer", null);
    return;
  }

  const valkeyConsumer = new SessionNotificationsConsumer(config.valkey);
  valkeyConsumer.start();

  fastify.decorate("valkeyConsumer", valkeyConsumer);
}

export const valkeyPlugin = fp(valkeyPluginImpl);
