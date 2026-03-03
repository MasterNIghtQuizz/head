import { UserRole, TokenType } from "./enums.js";

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
export type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

export interface AccessTokenPayload {
  userId: string;
  role: UserRoleValue;
  type: typeof TokenType.ACCESS;
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  userId: string;
  role: UserRoleValue;
  type: typeof TokenType.REFRESH;
  [key: string]: unknown;
}

export interface InternalTokenPayload {
  userId: string;
  role: UserRoleValue;
  type: typeof TokenType.INTERNAL;
  source: string;
  [key: string]: unknown;
}

export interface AuthHookOptions {
  publicKeyPath: string;
}

import type { SignOptions } from "jsonwebtoken";

export interface InternalTokenInterceptorOptions {
  privateKeyPath: string;
  source?: string;
  expiresIn?: SignOptions["expiresIn"];
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload | Omit<InternalTokenPayload, "source">;
    refreshTokenPayload?: RefreshTokenPayload;
    internalTokenPayload?: InternalTokenPayload;
  }
}
