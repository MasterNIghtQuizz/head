import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  onRequestHookHandler,
} from "fastify";

export declare const UserRole: {
  readonly ADMIN: "admin";
  readonly USER: "user";
  readonly MODERATOR: "moderator";
};

export declare const TokenType: {
  readonly ACCESS: "access";
  readonly REFRESH: "refresh";
  readonly INTERNAL: "internal";
};

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

export interface InternalTokenInterceptorOptions {
  privateKeyPath: string;
  source?: string;
  expiresIn?: string;
}

export declare const IS_PUBLIC: unique symbol;

export declare function Public(): (
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => void;

export declare function hookAccessToken(
  options: AuthHookOptions,
): onRequestHookHandler;

export declare function hookRefreshToken(
  options: AuthHookOptions,
): onRequestHookHandler;

export declare function hookInternalToken(
  options: AuthHookOptions,
): onRequestHookHandler;

export declare function hookInternalTokenInterceptor(
  options: InternalTokenInterceptorOptions,
): onRequestHookHandler;

declare module "fastify" {
  interface FastifyRequest {
    user?:
      | AccessTokenPayload
      | Pick<InternalTokenPayload, "userId" | "role" | "type">;
    refreshTokenPayload?: RefreshTokenPayload;
    internalTokenPayload?: InternalTokenPayload;
    internalToken?: string;
  }

  interface FastifyContextConfig {
    isPublic?: boolean;
  }
}
