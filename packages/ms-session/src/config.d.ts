export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  postgres: Record<string, any>;
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
    access: { privateKeyPath: string; publicKeyPath: string };
    refresh: { privateKeyPath: string; publicKeyPath: string };
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
