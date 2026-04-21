export declare const config: {
  env: string;
  port: number;
  logger: {
    level: string;
    pretty: boolean;
  };
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
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
  };
  otel?: {
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
  };
};
