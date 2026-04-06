import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USER_ACCESS_TOKEN_SECRET = 'test-user-access-secret';
process.env.USER_ACCESS_TOKEN_TTL_DAYS = '2';

const { signUserAccessToken } = await import('../services/userJwt.service.js');
const {
  readUserAccessToken,
  requireUserAuth,
  optionalUserAuth,
} = await import('../middlewares/userAuth.js');

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error ?? null));
  });
}

test('readUserAccessToken reads bearer token from request headers', () => {
  const req = {
    headers: {
      authorization: 'Bearer abc.def.ghi',
    },
  };

  assert.equal(readUserAccessToken(req), 'abc.def.ghi');
});

test('requireUserAuth attaches req.user when token is valid', async () => {
  const signed = signUserAccessToken({ id_users: '99' });
  const req = {
    headers: {
      authorization: `Bearer ${signed.token}`,
    },
  };

  const error = await runMiddleware(requireUserAuth, req);

  assert.equal(error, null);
  assert.equal(req.user?.idUser, '99');
  assert.match(req.user?.expiresAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
});

test('requireUserAuth rejects requests without token', async () => {
  const req = { headers: {} };

  const error = await runMiddleware(requireUserAuth, req);

  assert.equal(error?.code, 'USER_AUTH_REQUIRED');
});

test('optionalUserAuth leaves req.user unset when token is absent', async () => {
  const req = { headers: {} };

  const error = await runMiddleware(optionalUserAuth, req);

  assert.equal(error, null);
  assert.equal(req.user, undefined);
});
