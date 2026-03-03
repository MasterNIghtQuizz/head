export declare class BaseError extends Error {
  statusCode: number;
  metadata: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    metadata?: Record<string, unknown>,
  );
}

export declare class BadRequestError extends BaseError {
  constructor(message?: string, metadata?: Record<string, unknown>);
}

export declare class UnauthorizedError extends BaseError {
  constructor(message?: string, metadata?: Record<string, unknown>);
}

export declare class ForbiddenError extends BaseError {
  constructor(message?: string, metadata?: Record<string, unknown>);
}

export declare class NotFoundError extends BaseError {
  constructor(message?: string, metadata?: Record<string, unknown>);
}

export declare class ConflictError extends BaseError {
  constructor(message?: string, metadata?: Record<string, unknown>);
}

export declare class InternalServerError extends BaseError {
  constructor(message?: string, metadata?: Record<string, unknown>);
}
