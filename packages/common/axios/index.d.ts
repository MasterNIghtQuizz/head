export interface CallConfig<Request = any> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: Request;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export declare function call<Request = any, Response = any>(
  config: CallConfig<Request>,
): Promise<Response>;
