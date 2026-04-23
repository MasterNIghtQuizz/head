import { createLogger, setLogger } from "common-logger";
import { config } from "./config.js";

const logger = createLogger({
  name: "ms-response",
  level: /** @type {import('pino').LevelWithSilent} */ (config.logger.level),
  pretty: /** @type {boolean} */ (config.logger.pretty),
  opensearch: config.opensearch?.enabled
    ? {
        node: config.opensearch.node,
        index: config.opensearch.index,
        auth: config.opensearch.auth,
        ssl: config.opensearch.ssl,
      }
    : undefined,
});

setLogger(logger);

export default logger;
