import pino from "pino";

const redactFields = [
  "req.headers.authorization",
  "password",
  "token",
  "secret",
  "key",
  "*.password",
  "*.token",
  "*.secret",
];

/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} [options.level='info']
 * @param {boolean} [options.pretty=false]
 * @returns {import('pino').Logger}
 */
export const createLogger = ({ name, level = "info", pretty = false }) => {
  return pino({
    name,
    level,
    redact: {
      paths: redactFields,
      remove: true,
    },
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    transport: pretty
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss Z",
          },
        }
      : undefined,
  });
};

const logger = createLogger({ name: "app" });

export default logger;
