import "reflect-metadata";

/**
 * Metadata keys for decorators
 */
export const MetadataKeys = {
  CONTROLLER: "controller",
  ROUTES: "routes",
  SCHEMA: "schema",
  IS_PUBLIC: "isPublic",
  ROLES: "roles",
  USE_REFRESH_TOKEN: "useRefreshToken",
  USE_GAME_TOKEN: "useGameToken",
};

/**
 * @param {string} prefix
 */
export function Controller(prefix = "") {
  /** @param {Function} target */
  return function (target) {
    Reflect.defineMetadata(MetadataKeys.CONTROLLER, prefix, target);
  };
}

/**
 * @param {string} method
 */
function createRouteDecorator(method) {
  /** @param {string} path */
  return function (path = "") {
    /**
     * @param {any} target
     * @param {string} propertyKey
     * @param {PropertyDescriptor} _descriptor
     */
    return function (target, propertyKey, _descriptor) {
      const routes =
        Reflect.getMetadata(MetadataKeys.ROUTES, target.constructor) || [];
      routes.push({
        method,
        path,
        handler: propertyKey,
      });
      Reflect.defineMetadata(MetadataKeys.ROUTES, routes, target.constructor);
    };
  };
}

export const Get = createRouteDecorator("GET");
export const Post = createRouteDecorator("POST");
export const Put = createRouteDecorator("PUT");
export const Delete = createRouteDecorator("DELETE");
export const Patch = createRouteDecorator("PATCH");

export function Public() {
  /**
   * @param {any} target
   * @param {string} propertyKey
   * @param {PropertyDescriptor} _descriptor
   */
  return function (target, propertyKey, _descriptor) {
    Reflect.defineMetadata(
      MetadataKeys.IS_PUBLIC,
      true,
      target.constructor,
      propertyKey,
    );
  };
}

/**
 * @param {any} schema
 */
export function Schema(schema) {
  /**
   * @param {any} target
   * @param {string} propertyKey
   * @param {PropertyDescriptor} _descriptor
   */
  return function (target, propertyKey, _descriptor) {
    Reflect.defineMetadata(
      MetadataKeys.SCHEMA,
      schema,
      target.constructor,
      propertyKey,
    );
  };
}

/**
 * @param {Function} targetClass
 * @param {string} methodName
 * @param {Array<Function>} decorators
 */
export function ApplyMethodDecorators(targetClass, methodName, decorators) {
  const descriptor = Object.getOwnPropertyDescriptor(
    targetClass.prototype,
    methodName,
  );
  if (!descriptor) {
    throw new Error(`Method ${methodName} not found on ${targetClass.name}`);
  }
  for (const decorator of decorators) {
    decorator(targetClass.prototype, methodName, descriptor);
  }
}

/**
 * @param {string[]} roles
 */
export function Roles(roles) {
  /**
   * @param {any} target
   * @param {string} propertyKey
   * @param {PropertyDescriptor} _descriptor
   */
  return function (target, propertyKey, _descriptor) {
    Reflect.defineMetadata(
      MetadataKeys.ROLES,
      roles,
      target.constructor,
      propertyKey,
    );
  };
}

export function UseRefreshToken() {
  /**
   * @param {any} target
   * @param {string} propertyKey
   * @param {PropertyDescriptor} _descriptor
   */
  return function (target, propertyKey, _descriptor) {
    Reflect.defineMetadata(
      MetadataKeys.USE_REFRESH_TOKEN,
      true,
      target.constructor,
      propertyKey,
    );
  };
}

export function UseGameToken() {
  /**
   * @param {any} target
   * @param {string} propertyKey
   * @param {PropertyDescriptor} _descriptor
   */
  return function (target, propertyKey, _descriptor) {
    Reflect.defineMetadata(
      MetadataKeys.USE_GAME_TOKEN,
      true,
      target.constructor,
      propertyKey,
    );
  };
}
