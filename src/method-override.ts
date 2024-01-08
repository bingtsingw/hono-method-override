import type { Env } from 'hono';
import type { ExecutionContext } from 'hono/dist/types/context';
import { getQuery } from 'ufo';

const METHODS = ['get', 'post', 'put', 'delete', 'options', 'patch'];

type HonoRequest = (
  request: Request,
  Env?: Env['Bindings'] | {},
  executionCtx?: ExecutionContext,
) => Response | Promise<Response>;

export const methodOverride = (honoFetch: HonoRequest, _getter?: string | string[]) => {
  const getter = _getter || 'X-HTTP-Method-Override';
  const getters = typeof getter === 'string' ? [getter] : getter;

  return (_request: Request, env?: Env, ctx?: ExecutionContext) => {
    // only post method can be override
    const request = _request.method === 'POST' ? replaceRequest(getters, _request) : _request;

    return honoFetch(request, env, ctx);
  };
};

const replaceRequest = (getters: string[], request: Request): Request => {
  let method = request.method;

  for (const getter of getters) {
    if (typeof getter !== 'string') {
      continue;
    }

    if (getter.substring(0, 2).toUpperCase() === 'X-') {
      const _method = normalizeMethod(parseHeaderGetter(getter, request));
      if (_method) {
        method = _method;
      }
    } else {
      const _method = normalizeMethod(parseQueryGetter(getter, request));
      if (_method) {
        method = _method;
      }
    }
  }

  if (method !== request.method) {
    return new Request(request, { method: method.toLowerCase() });
  }

  return request;
};

const parseHeaderGetter = (getter: string, request: Request): string | undefined => {
  const _method = request.headers.get(getter.toLowerCase());
  if (_method) {
    // handle single header with multiple values
    const methods = _method.split(',').map((v) => v.trim());

    // return first non-empty value
    for (const m of methods) {
      if (m.length > 0) {
        return m;
      }
    }
  }
};

const parseQueryGetter = (getter: string, request: Request): string | undefined => {
  const _method = getQuery(request.url)[getter];
  if (_method) {
    // _methods can be complex value such as `['GET', 'post', 'post,  DELETE']`
    const _methods = typeof _method === 'string' ? [_method] : _method;

    for (const _m of _methods) {
      // handle single query with multiple values
      const methods = _m.split(',').map((v) => v.trim());

      // return first non-empty value
      for (const m of methods) {
        if (m.length > 0) {
          return m;
        }
      }
    }
  }
};

const normalizeMethod = (method?: string): string | undefined => {
  if (method && typeof method === 'string' && METHODS.includes(method.toLowerCase())) {
    return method.toLowerCase();
  }
};
