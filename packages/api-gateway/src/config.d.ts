export declare const config: {
  env: string;
  port: number;
  logger: Record<string, unknown>;
  services: {
    user: string;
    quizz: string;
  };
  auth: {
    access: { privateKeyPath: string; publicKeyPath: string };
    refresh: { privateKeyPath: string; publicKeyPath: string };
    internal: { privateKeyPath: string; publicKeyPath: string };
  };
};
