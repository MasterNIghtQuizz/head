export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  postgres: import('common-database').DatabaseConfig;

  kafka: {
    enabled: boolean;
    brokers: string[];
  };
  auth: {
    internal: { privateKeyPath: string; publicKeyPath: string };
  };
  valkey: import("common-valkey").ValkeyConfig & { ttl: number };
  otel: {
    enabled: boolean;
    exporterUrl: string;
  };
  opensearch: {
    enabled: boolean;
    node: string;
    index: string;
    auth?: {
      username?: string;
      password?: string;
    };
    ssl?: {
      rejectUnauthorized?: boolean;
    };
  };
};
