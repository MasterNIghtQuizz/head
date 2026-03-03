export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  postgres: Record<string, any>;
  auth: {
    internal: { privateKeyPath: string; publicKeyPath: string };
  };
};
