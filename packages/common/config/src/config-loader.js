import fs from "node:fs";
import path from "node:path";

/** @type {typeof import('./config-loader.d.ts').readJson} */
const readJson = (configPath) => {
  if (!fs.existsSync(configPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
};

/**
 * @param {any} target
 * @param {any} source
 * @returns {any}
 */
const merge = (target, source) => {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) {
        target[key] = /** @type {Record<string, unknown>} */ ({});
      }
      merge(
        /** @type {Record<string, unknown>} */ (target[key]),
        /** @type {Record<string, unknown>} */ (source[key]),
      );
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

/** @type {typeof import('./config-loader.d.ts').resolveEnvVars} */
const resolveEnvVars = (mapping) => {
  /** @type {Record<string, unknown>} */
  const result = {};
  for (const key of Object.keys(mapping)) {
    if (typeof mapping[key] === "string") {
      const envVarName = mapping[key];
      if (process.env[envVarName] !== undefined) {
        result[key] = process.env[envVarName];
      }
    } else if (mapping[key] instanceof Object && !Array.isArray(mapping[key])) {
      const resolved = resolveEnvVars(
        /** @type {Record<string, unknown>} */ (mapping[key]),
      );
      if (Object.keys(resolved).length > 0) {
        result[key] = resolved;
      }
    }
  }
  return result;
};

/** @type {typeof import('./config-loader.d.ts').loadConfig} */
export const loadConfig = (directory) => {
  const defaultConfig = readJson(path.join(directory, "default.json"));

  const env = process.env.NODE_ENV || "development";
  const envFileConfig = readJson(path.join(directory, `${env}.json`));

  const envMapping = readJson(
    path.join(directory, "custom-environment-variables.json"),
  );
  const envConfig = resolveEnvVars(envMapping);

  const config = merge(defaultConfig, envFileConfig);
  return merge(config, envConfig);
};

export { merge };
