import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { SocketContext } from 'common-websocket';

export * from './ws.js';
export * from './fastify.js';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      KAFKA_BROKERS: string;
      VALKEY_HOST: string;
      VALKEY_PORT: string;
    }
  }
}
