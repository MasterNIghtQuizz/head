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
};
