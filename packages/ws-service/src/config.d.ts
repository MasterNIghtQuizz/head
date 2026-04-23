export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  kafka: {
    enabled: boolean;
    brokers: string[];
  };
  auth: {
    access: { privateKeyPath: string; publicKeyPath: string };
    refresh: { privateKeyPath: string; publicKeyPath: string };
    internal: { privateKeyPath: string; publicKeyPath: string };
  };
  security: {
    encryptionKey: string;
  };
  valkey: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db?: number;
    ttl?: number;
  };
  otel: {
    enabled: boolean;
    exporterUrl: string;
  };
  opensearch: {
    enabled: boolean;
    node: string;
    index: string;
  };
  metrics: {
    enabled: boolean;
  };
};
