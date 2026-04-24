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
    frontendUrl: Joi.string().optional(),
  }).required(),
  logger: Joi.object({
    level: Joi.string().required(),
    pretty: Joi.boolean().required(),
  }).required(),
  services: Joi.object({
    user: Joi.string().uri().required(),
    quizz: Joi.string().uri().required(),
    websocket: Joi.string().uri().required(),
    session: Joi.string().uri().required(),
  }).required(),
  auth: Joi.object({
    access: Joi.object({
      privateKeyPath: Joi.string().required(),
      publicKeyPath: Joi.string().required(),
    }).required(),
    refresh: Joi.object({
      privateKeyPath: Joi.string().required(),
      publicKeyPath: Joi.string().required(),
    }).required(),
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
  /** @type {{ access: { privateKeyPath: string; publicKeyPath: string; }; refresh: { privateKeyPath: string; publicKeyPath: string; }; internal: { privateKeyPath: string; publicKeyPath: string; }; game: { privateKeyPath: string; publicKeyPath: string; } }} */ (
    Config.get("auth")
  );

/** @type {typeof import('./config.d.ts').config} */
export const config = {
  env: /** @type {string} */ (Config.get("app.env")),
  port: /** @type {number} */ (Config.get("app.port")),
  frontendUrl: /** @type {string} */ (Config.get("app.frontendUrl")),
  logger: /** @type {Record<string, unknown>} */ (Config.get("logger")),
  services:
    /** @type {{ user: string; quizz: string; session:string; websocket: string }} */ (
      Config.get("services")
    ),
  kafka: /** @type {{ brokers: string[] }} */ (Config.get("kafka")),
  auth: {
    access: {
      privateKeyPath: resolveKeyPath(rawAuth.access.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.access.publicKeyPath),
    },
    refresh: {
      privateKeyPath: resolveKeyPath(rawAuth.refresh.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.refresh.publicKeyPath),
    },
    internal: {
      privateKeyPath: resolveKeyPath(rawAuth.internal.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.internal.publicKeyPath),
    },
    game: {
      privateKeyPath: resolveKeyPath(rawAuth.game.privateKeyPath),
      publicKeyPath: resolveKeyPath(rawAuth.game.publicKeyPath),
    },
  },
  valkey:
    /** @type {{ enabled: boolean; host: string; port: number; password: string; db: number; ttl: number }} */ (
      Config.get("valkey")
    ),
  otel: /** @type {{ enabled: boolean; exporterUrl: string }} */ (
    Config.get("otel")
  ),
  opensearch: /** @type {{ enabled: boolean; node: string; index: string }} */ (
    Config.get("opensearch")
  ),
};
