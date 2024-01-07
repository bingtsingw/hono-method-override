import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';

describe('methodOverride', () => {
  const app = new Hono();

  app
    .get('/', (c) => c.text('get /'))
    .post('/', (c) => c.text('post /'))
    .put('/', (c) => c.text('put /'))
    .patch('/', (c) => c.text('patch /'))
    .delete('/', (c) => c.text('delete /'));

  test('', async () => {
    const res = await app.fetch(new Request({ url: 'http://localhost/', method: 'get' }));

    expect(await res.text()).toEqual('get /');
  });
});
