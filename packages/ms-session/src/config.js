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
  postgres: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().required(),
    database: Joi.string().required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
  }).required(),
  auth: Joi.object({
    internal: Joi.object({
      privateKeyPath: Joi.string().required(),
      publicKeyPath: Joi.string().required(),
    }).required(),
    game: Joi.object({
      privateKeyPath: Joi.string().required(),
      publicKeyPath: Joi.string().required(),
    }).required(),
  }).required(),
  kafka: Joi.object({
    brokers: Joi.array().items(Joi.string()).required(),
    enabled: Joi.boolean().default(true),
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
  services: Joi.object({
    session: Joi.object({
      baseUrl: Joi.string().uri().required(),
    }).required(),
    quizzManagement: Joi.object({
      baseUrl: Joi.string().uri().required(),
    }).required(),
  }).required(),
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
  /** @type {{ access: { privateKeyPath: string; publicKeyPath: string; }; refresh: { privateKeyPath: string; publicKeyPath: string; }; internal: { privateKeyPath: string; publicKeyPath: string; }; game: { privateKeyPath: string; publicKeyPath: string; } }} */ (
    Config.get("auth")
  );

/** @type {typeof import('./config.d.ts').config} */
export const config = {
  env: /** @type {string} */ (Config.get("app.env")),
  port: /** @type {number} */ (Config.get("app.port")),
  logger: /** @type {Record<string, unknown>} */ (Config.get("logger")),
  postgres: /** @type {Record<string, any>} */ (Config.get("postgres")),
  kafka: /** @type {{ brokers: string[]; enabled:boolean }} */ (
    Config.get("kafka")
  ),
  valkey: /** @type {import('common-valkey').ValkeyConfig} */ (
    Config.get("valkey")
  ),
  auth: {
    internal: {
      privateKeyPath: resolveKeyPath(rawAuth.internal.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.internal.publicKeyPath),
    },
    game: {
      privateKeyPath: resolveKeyPath(rawAuth.game.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.game.publicKeyPath),
    },
  },
  otel: /** @type {{ enabled: boolean; exporterUrl: string }} */ (
    Config.get("otel") || { enabled: false, exporterUrl: "" }
  ),
  services:
    /** @type {{ session: { baseUrl: string; }; quizzManagement: { baseUrl: string; }; }} */ (
      Config.get("services")
    ),
  opensearch:
    /** @type {{ enabled: boolean; node: string; index: string } | undefined} */ (
      Config.get("opensearch")
    ),
};
