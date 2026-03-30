import { createLogger, setLogger } from "common-logger";
import { config } from "./config.js";

const logger = createLogger({
  name: "ms-session",
  level: /** @type {import('pino').LevelWithSilent} */ (config.logger.level),
  pretty: /** @type {boolean} */ (config.logger.pretty),
});

setLogger(logger);

export default logger;
