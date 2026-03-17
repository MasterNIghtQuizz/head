import { Logger, LevelWithSilent } from "pino";

export interface OpenSearchConfig {
  node: string;
  index: string;
  auth?: {
    username?: string;
    password?: string;
  };
}

export interface LoggerOptions {
  name: string;
  level?: LevelWithSilent;
  pretty?: boolean;
  opensearch?: OpenSearchConfig;
}

export declare const createLogger: (options: LoggerOptions) => Logger;
export declare const setLogger: (newLogger: Logger) => void;
export declare const silenceLogger: () => void;
export declare const mockLogger: (vi?: any) => any;
declare const logger: Logger;
export default logger;
