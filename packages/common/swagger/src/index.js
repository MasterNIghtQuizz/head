import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

/**
 * @param {any} app
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {string} options.version
 * @param {string} [options.routePrefix='/docs']
 */
export const registerSwagger = async (
  app,
  { title, description, version, routePrefix = "/docs" },
) => {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title,
        description,
        version,
      },
      servers: [],
      components: {
        securitySchemes: {
          accessToken: {
            type: "apiKey",
            name: "access-token",
            in: "header",
            description: "Default Access Token (Public)",
          },
          refreshToken: {
            type: "apiKey",
            name: "refresh-token",
            in: "header",
            description: "Default Refresh Token (Public)",
          },
          internalToken: {
            type: "apiKey",
            name: "internal-token",
            in: "header",
            description: "Service-to-Service Internal Token",
          },
        },
        schemas: {
          BaseError: {
            type: "object",
            properties: {
              statusCode: { type: "integer" },
              error: { type: "string" },
              message: { type: "string" },
              metadata: {
                type: "object",
                additionalProperties: true,
              },
            },
            required: ["statusCode", "error", "message"],
          },
        },
        responses: {
          BadRequest: {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BaseError" },
                example: {
                  statusCode: 400,
                  error: "Bad Request",
                  message: "Invalid parameters",
                  metadata: {},
                },
              },
            },
          },
          Unauthorized: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BaseError" },
                example: {
                  statusCode: 401,
                  error: "Unauthorized",
                  message: "Missing or invalid token",
                  metadata: {},
                },
              },
            },
          },
          Forbidden: {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BaseError" },
                example: {
                  statusCode: 403,
                  error: "Forbidden",
                  message: "Insufficient permissions",
                  metadata: {},
                },
              },
            },
          },
          NotFound: {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BaseError" },
                example: {
                  statusCode: 404,
                  error: "Not Found",
                  message: "Resource not found",
                  metadata: {},
                },
              },
            },
          },
          Conflict: {
            description: "Conflict",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BaseError" },
                example: {
                  statusCode: 409,
                  error: "Conflict",
                  message: "Resource already exists",
                  metadata: {},
                },
              },
            },
          },
          InternalServerError: {
            description: "Internal Server Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BaseError" },
                example: {
                  statusCode: 500,
                  error: "Internal Server Error",
                  message: "An unexpected error occurred",
                  metadata: {},
                },
              },
            },
          },
        },
      },
      security: [
        { accessToken: [] },
        { refreshToken: [] },
        { internalToken: [] },
      ],
    },
  });

  app.addHook(
    "onRoute",
    /** @param {any} routeOptions */ (routeOptions) => {
      if (routeOptions.url.startsWith(routePrefix)) {
        routeOptions.config = routeOptions.config || {};
        routeOptions.config.isPublic = true;
      }
    },
  );

  await app.register(fastifySwaggerUi, {
    routePrefix,
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: /** @param {string} header */ (header) => header,
  });
};
