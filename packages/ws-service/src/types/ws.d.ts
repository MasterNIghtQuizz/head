import { WebSocket, WebSocketServer } from 'ws';
import { SocketContext } from 'common-websocket';

export interface ExtendedWebSocket extends WebSocket {
  context?: SocketContext;
  on(event: 'message', listener: (data: any, isBinary: boolean) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  send(data: any, cb?: (err?: Error) => void): void;
  close(code?: number, data?: string | Buffer): void;
  terminate(): void;
  ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
  pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
}

export interface WSServiceConfig {
  port: number;
  valkey: {
    enabled: boolean;
    host: string;
    port: number;
  };
  kafka: {
    enabled: boolean;
    brokers: string[];
  };
  otel: {
    enabled: boolean;
    exporterUrl: string;
  };
  auth: {
    internal: {
      publicKeyPath: string;
    };
  };
}
