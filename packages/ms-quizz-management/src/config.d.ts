export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  postgres: Record<string, any>;
  kafka: {
    brokers: string[];
  };
  auth: {
    internal: { privateKeyPath: string; publicKeyPath: string };
  };
};
