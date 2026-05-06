export declare const config: {
  env: string;
  port: number;
  frontendUrl: string;
  logger: Record<string, unknown>;
  services: {
    user: string;
    quizz: string;
    websocket: string;
    session: string;
    response: string;
  };
  kafka: {
    brokers: string[];
  };
  auth: {
    access: { privateKeyPath: string; publicKeyPath: string };
    refresh: { privateKeyPath: string; publicKeyPath: string };
    internal: { privateKeyPath: string; publicKeyPath: string };
    game: { privateKeyPath: string; publicKeyPath: string };
  };
  valkey: {
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
    auth?: {
      username?: string;
      password?: string;
    };
    ssl?: {
      rejectUnauthorized?: boolean;
    };
  };
};
