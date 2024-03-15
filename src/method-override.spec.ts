import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { methodOverride } from './method-override';

const methods = ['get', 'post', 'put', 'delete', 'options', 'patch'] as const;
type METHOD = Uppercase<(typeof methods)[number]>;

describe('methodOverride', () => {
  const app = new Hono();

  app
    .use('*', async (ctx, next) => {
      ctx.header('X-Got-Method', ctx.req.method);
      await next();
    })
    .all('/', (c) => c.text('/'));

  const testRequest = async (method: METHOD): Promise<METHOD> => {
    const res = await app.fetch(new Request('http://localhost/', { method }));

    return res.headers.get('X-Got-Method') as METHOD;
  };

  const testOverrideRequest = async (
    method: METHOD,
    {
      _getter,
      query,
      headers,
    }: {
      _getter?: string | string[];
      query?: string;
      headers?: Record<string, string>;
    },
  ): Promise<METHOD> => {
    const res = await methodOverride(app.fetch, _getter)(new Request(`http://localhost?${query}`, { method, headers }));

    return res.headers.get('X-Got-Method') as METHOD;
  };

  test('original', async () => {
    expect(await testRequest('GET')).toEqual('GET');
    expect(await testRequest('POST')).toEqual('POST');
    expect(await testRequest('PUT')).toEqual('PUT');
    expect(await testRequest('DELETE')).toEqual('DELETE');
    expect(await testRequest('OPTIONS')).toEqual('OPTIONS');
    expect(await testRequest('PATCH')).toEqual('PATCH');
  });

  test('use X-HTTP-Method-Override as default getter', async () => {
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'GET' } })).toEqual('GET');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'POST' } })).toEqual('POST');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'PUT' } })).toEqual('PUT');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'DELETE' } })).toEqual('DELETE');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'OPTIONS' } })).toEqual('OPTIONS');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'PATCH' } })).toEqual('PATCH');
  });

  test('only post method can be override', async () => {
    expect(await testOverrideRequest('GET', { headers: { 'X-HTTP-Method-Override': 'DELETE' } })).toEqual('GET');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'DELETE' } })).toEqual('DELETE');
    expect(await testOverrideRequest('PUT', { headers: { 'X-HTTP-Method-Override': 'DELETE' } })).toEqual('PUT');
    expect(await testOverrideRequest('DELETE', { headers: { 'X-HTTP-Method-Override': 'PUT' } })).toEqual('DELETE');
    expect(await testOverrideRequest('OPTIONS', { headers: { 'X-HTTP-Method-Override': 'PUT' } })).toEqual('OPTIONS');
    expect(await testOverrideRequest('PATCH', { headers: { 'X-HTTP-Method-Override': 'PUT' } })).toEqual('PATCH');
  });

  test('case sensitive/in-sensitive', async () => {
    // headers keys and values are case in-sensitive
    expect(await testOverrideRequest('POST', { headers: { 'x-httP-mEthod-overRIDE': 'deLete' } })).toEqual('DELETE');
    expect(await testOverrideRequest('POST', { headers: { 'x-mEthod': 'deLete' }, _getter: 'X-method' })).toEqual(
      'DELETE',
    );

    // query keys are case-sensitive
    expect(await testOverrideRequest('POST', { query: '_Method=DELETE', _getter: '_method' })).toEqual('POST');
    expect(await testOverrideRequest('POST', { query: '_Method=DELETE', _getter: '_Method' })).toEqual('DELETE');

    // query values are case in-sensitive
    expect(await testOverrideRequest('POST', { query: '_Method=dElETe', _getter: '_Method' })).toEqual('DELETE');
  });

  test('handle multiple methods to override', async () => {
    // the first matched method take precedence
    expect(await testOverrideRequest('POST', { headers: { 'x-method': 'patch,put' }, _getter: 'x-method' })).toEqual(
      'PATCH',
    );
    expect(await testOverrideRequest('POST', { query: '_method=patch,put', _getter: '_method' })).toEqual('PATCH');
    expect(await testOverrideRequest('POST', { query: '_method=patch&method=put', _getter: '_method' })).toEqual(
      'PATCH',
    );
  });

  test('handle multiple getters to override', async () => {
    // the last getter take precedence
    expect(
      await testOverrideRequest('POST', {
        headers: { 'x-method1': 'patch', 'x-method2': 'put' },
        _getter: ['x-method2', 'x-method1'],
      }),
    ).toEqual('PATCH');

    expect(
      await testOverrideRequest('POST', {
        query: '_method1=patch&_method2=put',
        _getter: ['_method2', '_method1'],
      }),
    ).toEqual('PATCH');

    expect(
      await testOverrideRequest('POST', {
        headers: { 'x-method': 'patch' },
        query: '_method=put',
        _getter: ['x-method', '_method'],
      }),
    ).toEqual('PUT');

    expect(
      await testOverrideRequest('POST', {
        headers: { 'x-method': 'patch' },
        query: '_method=put',
        _getter: ['_method', 'x-method'],
      }),
    ).toEqual('PATCH');
  });

  test('ignore invalid methods', async () => {
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Override': 'GET1' } })).toEqual('POST');
    expect(await testOverrideRequest('POST', { headers: { 'X-HTTP-Method-Overrides': 'GET' } })).toEqual('POST');
    expect(await testOverrideRequest('POST', { query: '_method=get1', _getter: '_method' })).toEqual('POST');
    expect(await testOverrideRequest('POST', { query: '_methods=get', _getter: '_method' })).toEqual('POST');

    // the last valid getter take precedence
    expect(
      await testOverrideRequest('POST', {
        query: '_method=patch&_method1=delete&_method2=put',
        _getter: ['_method2', '_method1'],
      }),
    ).toEqual('DELETE');

    expect(
      await testOverrideRequest('POST', {
        headers: {
          'x-1': 'get1',
          'x-2': 'get',
          'x-3': 'patch',
        },
        _getter: ['x-3', 'x-2', 'x-1'],
      }),
    ).toEqual('GET');

    expect(
      await testOverrideRequest('POST', {
        query: '_method=patch&_method1=delete&_method2=put',
        headers: {
          'x-1': 'get1',
          'x-2': 'get',
          'x-3': 'patch',
        },
        _getter: ['_method2', '_method1', 'x-3', 'x-2', 'x-1'],
      }),
    ).toEqual('GET');

    expect(
      await testOverrideRequest('POST', {
        query: '_method=patch&_method1=delete&_method2=put',
        headers: {
          'x-1': 'get1',
          'x-2': 'get',
          'x-3': 'patch',
        },
        _getter: ['x-3', 'x-2', 'x-1', '_method2', '_method1'],
      }),
    ).toEqual('DELETE');

    expect(
      await testOverrideRequest('POST', {
        query: '_method=  ,  ',
        headers: {
          'x-1': '  ,  ',
        },
        _getter: ['x-1', '_method'],
      }),
    ).toEqual('POST');
  });
});
