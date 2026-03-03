import { vi, Mock } from "vitest";
import { FastifyRequest, FastifyReply } from "fastify";

export function createExecutionContext(
  headers: Record<string, string> = {},
  user: any = undefined,
) {
  const request: any = {
    headers,
    url: "/test-route",
    routeOptions: {
      config: {
        isPublic: false,
      },
    },
    user,
  };

  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn(),
  } as unknown as FastifyReply;

  const done = vi.fn();

  return { request, reply, done };
}
