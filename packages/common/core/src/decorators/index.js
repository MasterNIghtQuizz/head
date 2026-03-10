import "reflect-metadata";

/**
 * Metadata keys for decorators
 */
export const MetadataKeys = {
  CONTROLLER: "controller",
  ROUTES: "routes",
  SCHEMA: "schema",
  IS_PUBLIC: "isPublic",
};

/**
 * Controller decorator to mark classes as Fastify controllers.
 * @param {string} prefix
 */
export function Controller(prefix = "") {
  /** @param {Function} target */
  return function (target) {
    Reflect.defineMetadata(MetadataKeys.CONTROLLER, prefix, target);
  };
}

/**
 * Route decorator factory
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

/**
 * Public decorator to mark routes as public
 */
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
 * Schema decorator for Swagger documentation
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
 * Utility to apply multiple decorators to a class method
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
