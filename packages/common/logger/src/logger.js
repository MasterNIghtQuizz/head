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
  "*.key",
];

/**
 * @typedef {Object} OpenSearchConfig
 * @property {string} node
 * @property {string} index
 * @property {Object} [auth]
 * @property {string} [auth.username]
 * @property {string} [auth.password]
 */

/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} [options.level='info']
 * @param {boolean} [options.pretty=false]
 * @param {OpenSearchConfig} [options.opensearch]
 * @returns {import('pino').Logger}
 */
export const createLogger = ({
  name,
  level = "info",
  pretty = false,
  opensearch = undefined,
}) => {
  const streams = [];

  if (pretty) {
    streams.push({
      stream: pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "HH:MM:ss Z",
        },
      }),
    });
  } else {
    streams.push({ stream: pino.destination(1) });
  }

  if (opensearch) {
    streams.push({
      level,
      stream: pino.transport({
        target: "pino-opensearch",
        options: {
          node: opensearch.node,
          index: opensearch.index,
          opensearchKeyValues: {
            service: name,
          },
          batchSize: 50,
        },
      }),
    });
  }

  return pino(
    {
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
    },
    pino.multistream(streams),
  );
};

let currentLogger = pino({
  name: "app",
  level: "info",
  formatters: { level: (label) => ({ level: label.toUpperCase() }) },
});

/**
 * @param {import('pino').Logger} newLogger
 */
export const setLogger = (newLogger) => {
  currentLogger = newLogger;
};

const loggerProxy = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      const value = Reflect.get(currentLogger, prop, receiver);
      if (typeof value === "function") {
        return value.bind(currentLogger);
      }
      return value;
    },
  },
);

export default /** @type {import('pino').Logger} */ (loggerProxy);
