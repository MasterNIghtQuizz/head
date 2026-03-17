import { createLogger, setLogger } from "common-logger";
import { config } from "./config.js";

const logger = createLogger({
  name: "ms-user",
  level: /** @type {import('pino').LevelWithSilent} */ (config.logger.level),
  pretty: /** @type {boolean} */ (config.logger.pretty),
  opensearch: config.opensearch?.enabled
    ? {
        node: config.opensearch.node,
        index: config.opensearch.index,
      }
    : undefined,
});

setLogger(logger);

export default logger;
