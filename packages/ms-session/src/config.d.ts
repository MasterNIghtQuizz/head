export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  postgres: import('common-database').DatabaseConfig;

  kafka: {
    brokers: string[];
    enabled: boolean;
  };
  valkey: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db?: number;
    ttl?: number;
  };
  auth: {
    internal: { privateKeyPath: string; publicKeyPath: string };
    game: { privateKeyPath: string; publicKeyPath: string };
  };
  otel: {
    enabled: boolean;
    exporterUrl: string;
  };
  services: {
    session: {
      baseUrl: string;
    };
    quizzManagement: {
      baseUrl: string;
    };
  };
  opensearch?: {
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
