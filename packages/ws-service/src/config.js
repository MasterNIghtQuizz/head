import Joi from "joi";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Config } from "common-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDirectory = path.join(__dirname, "../config");

const schema = Joi.object({
  app: Joi.object({
    port: Joi.number().required(),
    env: Joi.string().valid("development", "production", "test").required(),
  }).required(),
  logger: Joi.object({
    level: Joi.string().required(),
    pretty: Joi.boolean().required(),
  }).required(),
  auth: Joi.object({
    internal: Joi.object({
      privateKeyPath: Joi.string().required(),
      publicKeyPath: Joi.string().required(),
    }).required(),
  }).required(),
  kafka: Joi.object({
    enabled: Joi.boolean().default(true),
    brokers: Joi.array().items(Joi.string()).required(),
  }).required(),
  security: Joi.object({
    encryptionKey: Joi.string().required(),
  }).required(),
  valkey: Joi.object({
    enabled: Joi.boolean().default(true),
    host: Joi.string().required(),
    port: Joi.number().required(),
    password: Joi.string().allow("").optional(),
    db: Joi.number().optional().default(0),
    ttl: Joi.number().optional().default(3600),
  }).optional(),
  otel: Joi.object({
    enabled: Joi.boolean().default(false),
    exporterUrl: Joi.string().uri().required(),
  }).optional(),
  opensearch: Joi.object({
    enabled: Joi.boolean().default(false),
    node: Joi.string().uri().required(),
    index: Joi.string().required(),
  }).optional(),
  metrics: Joi.object({
    enabled: Joi.boolean().default(true),
  }).optional(),
});

Config.init({ directory: configDirectory, schema });

const projectRoot = path.resolve(__dirname, "..");

const resolveKeyPath = (/** @type {string} */ keyPath) =>
  path.isAbsolute(keyPath) ? keyPath : path.resolve(projectRoot, keyPath);

const rawAuth =
  /** @type {{ access: { privateKeyPath: string; publicKeyPath: string; }; refresh: { privateKeyPath: string; publicKeyPath: string; }; internal: { privateKeyPath: string; publicKeyPath: string; } }} */ (
    Config.get("auth")
  );

/** @type {typeof import('./config.d.ts').config} */
export const config = {
  env: /** @type {string} */ (Config.get("app.env")),
  port: /** @type {number} */ (Config.get("app.port")),
  logger: /** @type {Record<string, unknown>} */ (Config.get("logger")),
  kafka: /** @type {{ brokers: string[], enabled: boolean }} */ (
    Config.get("kafka")
  ),
  auth: {
    internal: {
      privateKeyPath: resolveKeyPath(rawAuth.internal.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.internal.publicKeyPath),
    },
  },
  security: {
    encryptionKey: /** @type {string} */ (Config.get("security.encryptionKey")),
  },
  valkey: /** @type {import('common-valkey').ValkeyConfig} */ (
    Config.get("valkey")
  ),
  otel: /** @type {{ enabled: boolean; exporterUrl: string }} */ (
    Config.get("otel")
  ),
  opensearch: /** @type {{ enabled: boolean; node: string; index: string }} */ (
    Config.get("opensearch")
  ),
  metrics: /** @type {{ enabled: boolean }} */ (
    Config.get("metrics") || { enabled: true }
  ),
};
