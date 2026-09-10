import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveUserRole } from './auth.js';

test('falls back to operator for a missing or invalid database role', () => {
  assert.equal(resolveUserRole(undefined), 'operator');
  assert.equal(resolveUserRole('super-admin'), 'operator');
});

test('accepts a known role loaded from the trusted profile', () => {
  assert.equal(resolveUserRole('owner'), 'owner');
  assert.equal(resolveUserRole('manager'), 'manager');
});
