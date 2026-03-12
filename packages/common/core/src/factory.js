import "reflect-metadata";
import { MetadataKeys } from "./decorators/index.js";

export class ControllerFactory {
  /**
   * @param {import('fastify').FastifyInstance} fastify
   * @param {any} ControllerClass
   * @param {any[]} [deps=[]]
   * @returns {void}
   */
  static register(fastify, ControllerClass, deps = []) {
    const prefix =
      Reflect.getMetadata(MetadataKeys.CONTROLLER, ControllerClass) || "";
    /** @type {{ method: string, path: string, handler: string }[]} */
    const routes =
      Reflect.getMetadata(MetadataKeys.ROUTES, ControllerClass) || [];

    const instance = new ControllerClass(...deps);

    fastify.register(
      async (app) => {
        routes.forEach((route) => {
          const schema = Reflect.getMetadata(
            MetadataKeys.SCHEMA,
            ControllerClass,
            route.handler,
          );

          const isPublic =
            Reflect.getMetadata(
              MetadataKeys.IS_PUBLIC,
              ControllerClass,
              route.handler,
            ) === true;
          const useRefreshToken =
            Reflect.getMetadata(
              MetadataKeys.USE_REFRESH_TOKEN,
              ControllerClass,
              route.handler,
            ) === true;

          const roles = Reflect.getMetadata(
            MetadataKeys.ROLES,
            ControllerClass,
            route.handler,
          );

          app.route({
            method: route.method,
            url: route.path,
            schema: schema || {},
            config: { isPublic, roles, useRefreshToken },
            handler: instance[route.handler].bind(instance),
          });
        });
      },
      { prefix },
    );
  }
}
