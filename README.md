# hono-method-override

[![npm version][npm-version-src]][npm-version-href] [![npm downloads][npm-downloads-src]][npm-downloads-href] [![bundle][bundle-src]][bundle-href] [![License][license-src]][license-href]

A [Hono](https://hono.dev/) plugin to let you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.

This repo is highly inspired by [express method-override](https://github.com/expressjs/method-override).

## Install

```bash
$ npm install hono-method-override
```

## Usage

```typescript
import { Hono } from 'hono';
import { methodOverride } from 'hono-method-override';

const app = new Hono();

export default {
  fetch: methodOverride(app.fetch),
};
```

That's it! Simply wrap the `app.fetch` with `methodOverride`

## API

### `methodOverride(honoFetch: HonoRequest, _getter?: string | string[])`

What is a getter , a getter is where to look up the overridden request method, the default getter is `X-HTTP-Method-Override`, which means that the `methodOverride` plugin will look for and parse the overridden method in the `X-HTTP-Method-Override` request header

Tow types of getter is supported:

1. `HeaderGetter`: getter start with `x-/X-`, it will parse from request header, eg: `methodOverride(app.fetch, 'X-Method-Override')` should parse `curl -X POST -H 'X-Method-Override: PATCH' http://localhost`
2. `QueryGetter`: any string not start with `x-/X-`, it will parse from request query, eg: `methodOverride(app.fetch, '_method')` should parse `curl -X POST http://localhost?_method=PATCH`

! Note that **ONLY** `POST` request can be override, this design is for making the API concise and reduce errors.

## Examples

### header getter

```typescript
import { Hono } from 'hono';
import { methodOverride } from './src/method-override';
const app = new Hono();

app.patch('/', (c) => c.text('hello world'));

export default {
  fetch: methodOverride(app.fetch, 'X-Method-Override'),
};
// curl -X POST http://127.0.0.1:3000 -H 'X-Method-Override: patch' # hello world
```

### query getter

```typescript
import { Hono } from 'hono';
import { methodOverride } from './src/method-override';
const app = new Hono();

app.patch('/', (c) => c.text('hello world'));

export default {
  fetch: methodOverride(app.fetch, '_method'),
};
// curl -X POST http://127.0.0.1:3000\?_method\=patch # hello world
```

### multiple getters

If multiple getters are specified, the order passed to `methodOverride` getter array matters, the last one take precedence.

```typescript
import { Hono } from 'hono';
import { methodOverride } from './src/method-override';
const app = new Hono();

app
  .patch('/', (c) => c.text('hello patch'))
  .put('/', (c) => c.text('hello put'))
  .delete('/', (c) => c.text('hello delete'));

export default {
  fetch: methodOverride(app.fetch, ['_method', 'x-method', '_method2']),
};

// curl -X POST http://127.0.0.1:3000\?_method2\=delete\&_method\=patch -H 'x-method: put' # hello delete
```

### more examples

You can find more usages and examples in [test]('./src/method-override.spec.ts'), this project is 100% tested.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/hono-method-override
[npm-version-href]: https://npmjs.com/package/hono-method-override
[npm-downloads-src]: https://img.shields.io/npm/dm/hono-method-override
[npm-downloads-href]: https://npmjs.com/package/hono-method-override
[bundle-src]: https://img.shields.io/bundlephobia/minzip/hono-method-override
[bundle-href]: https://bundlephobia.com/result?p=hono-method-override
[license-src]: https://img.shields.io/github/license/bingtsingw/hono-method-override.svg
[license-href]: https://github.com/bingtsingw/hono-method-override/blob/main/LICENSE
