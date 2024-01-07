import type { Env } from 'hono';
import type { ExecutionContext } from 'hono/dist/types/context';

export const methodOverride = (
  honoFetch: (
    request: Request,
    Env?: Env['Bindings'] | {},
    executionCtx?: ExecutionContext,
  ) => Response | Promise<Response>,
) => {
  return (request: Request, env: Env, ctx: ExecutionContext) => {
    return honoFetch(new Request(request), env, ctx);
  };
};
