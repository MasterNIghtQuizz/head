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

          app.route({
            method: route.method,
            url: route.path,
            schema: schema || {},
            config: { isPublic },
            handler: instance[route.handler].bind(instance),
          });
        });
      },
      { prefix },
    );
  }
}
