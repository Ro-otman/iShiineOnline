import crypto from 'node:crypto';

import { env } from '../config/env.js';

const ACCESS_TOKEN_ISSUER = 'ishiine-online-admin';
const ACCESS_TOKEN_AUDIENCE = 'ishiine-admin';

function buildAuthError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getAccessTokenSecret() {
  const secret = String(env.ADMIN_ACCESS_TOKEN_SECRET || '').trim();
  if (!secret) {
    throw buildAuthError(
      'Configurer ADMIN_ACCESS_TOKEN_SECRET pour activer la connexion admin.',
      503,
      'ADMIN_ACCESS_SECRET_MISSING',
    );
  }
  return secret;
}

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(typeof input === 'string' ? input : JSON.stringify(input), 'utf8');

  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  let normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  return Buffer.from(normalized, 'base64');
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignature(unsignedToken, secret) {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(unsignedToken).digest());
}

export function signAdminAccessToken(admin) {
  const secret = getAccessTokenSecret();
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const ttlInSeconds = Math.max(60, Number(env.ADMIN_ACCESS_TOKEN_TTL_MINUTES || 15) * 60);
  const expiresAtInSeconds = nowInSeconds + ttlInSeconds;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    iss: ACCESS_TOKEN_ISSUER,
    aud: ACCESS_TOKEN_AUDIENCE,
    sub: String(admin.idAdmin),
    name: String(admin.displayName || 'Admin'),
    role: String(admin.role || 'admin'),
    type: 'access',
    iat: nowInSeconds,
    exp: expiresAtInSeconds,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createSignature(unsignedToken, secret);

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAt: new Date(expiresAtInSeconds * 1000).toISOString(),
    expiresInSeconds: ttlInSeconds,
  };
}

export function verifyAdminAccessToken(token) {
  const secret = getAccessTokenSecret();
  const parts = String(token || '').split('.');

  if (parts.length !== 3) {
    throw buildAuthError('Session admin invalide.', 401, 'ADMIN_ACCESS_TOKEN_INVALID');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createSignature(unsignedToken, secret);

  if (!timingSafeEqualText(signature, expectedSignature)) {
    throw buildAuthError('Session admin invalide.', 401, 'ADMIN_ACCESS_TOKEN_INVALID');
  }

  let header;
  let payload;

  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
  } catch {
    throw buildAuthError('Session admin invalide.', 401, 'ADMIN_ACCESS_TOKEN_INVALID');
  }

  if (header?.alg !== 'HS256' || payload?.type !== 'access') {
    throw buildAuthError('Session admin invalide.', 401, 'ADMIN_ACCESS_TOKEN_INVALID');
  }

  if (payload?.iss !== ACCESS_TOKEN_ISSUER || payload?.aud !== ACCESS_TOKEN_AUDIENCE) {
    throw buildAuthError('Session admin invalide.', 401, 'ADMIN_ACCESS_TOKEN_INVALID');
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload?.exp) || payload.exp <= nowInSeconds) {
    throw buildAuthError('Session admin expirée.', 401, 'ADMIN_ACCESS_TOKEN_EXPIRED');
  }

  return {
    idAdmin: Number(payload.sub),
    displayName: String(payload.name || 'Admin'),
    role: String(payload.role || 'admin'),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}
