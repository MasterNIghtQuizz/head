import {
  FastifyInstance,
  FastifySchema,
  RawServerBase,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  FastifyTypeProvider,
} from "fastify";

export declare abstract class BaseController {
  constructor();
}

export declare abstract class BaseService {
  constructor();
}

export declare abstract class BaseRepository<T = unknown> {
  datasource: unknown;
  entity: unknown;
  repo: unknown;
  constructor(datasource: unknown, entity: unknown);
  findAll(): Promise<T[]>;
  findOne(id: string | number): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<void>;
}

export declare function Controller(prefix?: string): ClassDecorator;
export declare function Get(path?: string): MethodDecorator;
export declare function Post(path?: string): MethodDecorator;
export declare function Put(path?: string): MethodDecorator;
export declare function Delete(path?: string): MethodDecorator;
export declare function Patch(path?: string): MethodDecorator;
export declare function Schema(schema: FastifySchema): MethodDecorator;
export declare const IS_PUBLIC: string;
export declare function Public(): MethodDecorator;
export declare function Roles(roles: string[]): MethodDecorator;
export declare function UseRefreshToken(): MethodDecorator;
export declare function UseGameToken(): MethodDecorator;
export declare function ApplyMethodDecorators(
  targetClass: Function,
  methodName: string,
  decorators: MethodDecorator[],
): void;

export declare class ControllerFactory {
  static register<
    Server extends RawServerBase,
    Request extends RawRequestDefaultExpression<Server>,
    Reply extends RawReplyDefaultExpression<Server>,
    Logger extends FastifyBaseLogger,
    TypeProvider extends FastifyTypeProvider,
    T,
    Args extends unknown[],
  >(
    fastify: FastifyInstance<Server, Request, Reply, Logger, TypeProvider>,
    ControllerClass: new (...args: Args) => T,
    deps?: Args,
  ): void;
}

export declare class Choice {
  id: string;
  text: string;
  is_correct?: boolean;
  constructor(props: { id: string; text: string; is_correct?: boolean });
}

export declare class Question {
  id: string;
  label: string;
  type: string;
  order_index: number;
  timer_seconds: number;
  choices: Choice[];
  constructor(props: {
    id: string;
    label: string;
    type: string;
    order_index: number;
    timer_seconds: number;
    choices?: (Choice | { id: string; text: string; is_correct?: boolean })[];
  });
}
