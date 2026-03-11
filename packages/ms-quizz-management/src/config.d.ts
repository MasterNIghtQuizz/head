export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  postgres: Record<string, any>;
  kafka: {
    enabled: boolean;
    brokers: string[];
  };
  auth: {
    internal: { privateKeyPath: string; publicKeyPath: string };
  };
  valkey: import("common-valkey").ValkeyConfig & { ttl: number };
};
