import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/errors.js';
import type { UserRole } from '../types/auth.js';
import { authorize } from './authorize.js';

const callAuthorize = (role?: UserRole) => {
  const request = {
    user: role
      ? {
          id: 'user-1',
          email: 'operator@example.com',
          fullName: 'Operador',
          role,
          status: 'active' as const,
        }
      : undefined,
  } as Request;
  let nextValue: unknown = Symbol('not-called');
  authorize('admin', 'manager')(request, {} as Response, ((value?: unknown) => {
    nextValue = value;
  }) as NextFunction);
  return nextValue;
};

test('rejects protected operations without an authenticated user', () => {
  const error = callAuthorize();

  assert.ok(error instanceof AppError);
  assert.equal(error.statusCode, 401);
});

test('rejects an authenticated user without the required role', () => {
  const error = callAuthorize('operator');

  assert.ok(error instanceof AppError);
  assert.equal(error.statusCode, 403);
});

test('allows an authenticated user with an accepted role', () => {
  assert.equal(callAuthorize('manager'), undefined);
});
