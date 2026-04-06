import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USER_ACCESS_TOKEN_SECRET = 'test-user-access-secret';
process.env.USER_ACCESS_TOKEN_TTL_DAYS = '2';

const { signUserAccessToken, verifyUserAccessToken } = await import(
  '../services/userJwt.service.js'
);

test('signUserAccessToken creates a verifiable mobile token', () => {
  const signed = signUserAccessToken({ id_users: '42' });
  const session = verifyUserAccessToken(signed.token);

  assert.equal(typeof signed.token, 'string');
  assert.equal(signed.token.split('.').length, 3);
  assert.equal(session.idUser, '42');
  assert.match(session.expiresAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('verifyUserAccessToken rejects a tampered signature', () => {
  const signed = signUserAccessToken({ id_users: '42' });
  const parts = signed.token.split('.');
  const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -1)}x`;

  assert.throws(
    () => verifyUserAccessToken(tampered),
    (error) => error?.code === 'USER_ACCESS_TOKEN_INVALID',
  );
});
