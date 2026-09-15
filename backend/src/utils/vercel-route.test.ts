import assert from 'node:assert/strict';
import test from 'node:test';

import { restoreApiRequestUrl } from './vercel-route.js';

test('restores nested API paths rewritten by Vercel', () => {
  assert.equal(
    restoreApiRequestUrl('/api/index?path=sync%2Fproducts&mode=incremental'),
    '/api/sync/products?mode=incremental',
  );
});

test('restores detail routes and removes the internal path parameter', () => {
  assert.equal(
    restoreApiRequestUrl('/api/index?path=products%2F123&view=full'),
    '/api/products/123?view=full',
  );
});

test('preserves the source URL when the platform exposes the public path', () => {
  assert.equal(
    restoreApiRequestUrl('/api/sync/products?mode=incremental'),
    '/api/sync/products?mode=incremental',
  );
});
