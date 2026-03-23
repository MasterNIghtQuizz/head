import pino from "pino";
import { trace, context, isSpanContextValid } from "@opentelemetry/api";

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

  // Console stream
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

  // OpenSearch stream
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
      mixin() {
        const span = trace.getSpan(context.active());
        if (!span) {
          return {};
        }

        const spanContext = span.spanContext();
        if (!isSpanContextValid(spanContext)) {
          return {};
        }

        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
          traceFlags: `0${spanContext.traceFlags.toString(16)}`,
        };
      },
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

export const silenceLogger = () => {
  currentLogger = pino({ level: "silent" });
};

export const mockLogger = (/** @type {{ fn: () => any; }} */ vi) => {
  const mock = {
    info: vi?.fn() || (() => {}),
    error: vi?.fn() || (() => {}),
    warn: vi?.fn() || (() => {}),
    debug: vi?.fn() || (() => {}),
    fatal: vi?.fn() || (() => {}),
    trace: vi?.fn() || (() => {}),
    silent: vi?.fn() || (() => {}),
    child:
      vi?.fn() ||
      (() => ({
        info: vi?.fn() || (() => {}),
        error: vi?.fn() || (() => {}),
        warn: vi?.fn() || (() => {}),
        debug: vi?.fn() || (() => {}),
        fatal: vi?.fn() || (() => {}),
        trace: vi?.fn() || (() => {}),
      })),
  };
  // @ts-ignore
  currentLogger = mock;
  return mock;
};

const loggerProxy = new Proxy(currentLogger, {
  get(_target, prop, receiver) {
    const value = Reflect.get(currentLogger, prop, receiver);
    if (typeof value === "function") {
      if (value.mock !== undefined || value._isMockFunction) {
        return value;
      }
      return value.bind(currentLogger);
    }
    return value;
  },
  has(_target, prop) {
    return Reflect.has(currentLogger, prop);
  },
  ownKeys(_target) {
    return Reflect.ownKeys(currentLogger);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(currentLogger, prop);
  },
});

export default /** @type {import('pino').Logger} */ (loggerProxy);
