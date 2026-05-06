import { Redis } from "ioredis";

export interface ValkeyConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttl?: number;
}

export class ValkeyService {
  constructor(config: ValkeyConfig);
  connect(): Promise<Redis>;
  disconnect(): Promise<void>;
  get client(): Redis;
}

export class ValkeyRepository {
  constructor(valkeyService: ValkeyService);
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
}
