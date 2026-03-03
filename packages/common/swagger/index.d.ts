import { FastifyInstance } from "fastify";

export interface SwaggerOptions {
  title: string;
  description: string;
  version: string;
  routePrefix?: string;
}

export declare function registerSwagger(
  app: FastifyInstance,
  options: SwaggerOptions,
): Promise<void>;
