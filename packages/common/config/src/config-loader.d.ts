export declare function readJson(configPath: string): Record<string, unknown>;
export declare function merge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown>;
export declare function resolveEnvVars(
  mapping: Record<string, unknown>,
): Record<string, unknown>;
export declare function loadConfig(directory: string): Record<string, unknown>;
