import assert from 'node:assert/strict';
import test from 'node:test';

import { paginate } from './pagination.js';

test('returns only the requested catalog page', () => {
  const result = paginate(Array.from({ length: 1518 }, (_, index) => index + 1), 2, 40);

  assert.equal(result.items.length, 40);
  assert.equal(result.items[0], 41);
  assert.equal(result.items.at(-1), 80);
  assert.equal(result.total, 1518);
  assert.equal(result.totalPages, 38);
});

test('caps interactive page sizes at 100 records', () => {
  const result = paginate(Array.from({ length: 500 }, (_, index) => index), 1, 5000);

  assert.equal(result.pageSize, 100);
  assert.equal(result.items.length, 100);
  assert.equal(result.totalPages, 5);
});
