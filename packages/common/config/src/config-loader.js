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
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      merge(target[key], source[key]);
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
      const obj = /** @type {Record<string, unknown>} */ (mapping[key]);
      if (typeof obj.__name === "string") {
        const envVarName = obj.__name;
        if (process.env[envVarName] !== undefined) {
          const raw = process.env[envVarName];
          result[key] =
            obj.__format === "json"
              ? JSON.parse(/** @type {string} */ (raw))
              : raw;
        }
      } else {
        const resolved = resolveEnvVars(obj);
        if (Object.keys(resolved).length > 0) {
          result[key] = resolved;
        }
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
