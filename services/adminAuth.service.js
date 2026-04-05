import crypto from 'node:crypto';

import { env } from '../config/env.js';
import {
  createAdminRefreshTokenSession,
  findActiveAdminRefreshToken,
  revokeAdminRefreshToken,
  revokeAdminRefreshTokenById,
} from '../models/adminRefreshTokens.model.js';
import { findActiveAdminByAccessKey, touchAdminLastLogin } from '../models/adminUsers.model.js';
import { signAdminAccessToken } from './adminJwt.service.js';

const ACCESS_COOKIE_NAME = 'ishiine_admin_access';
const REFRESH_COOKIE_NAME = 'ishiine_admin_refresh';
const ACCESS_COOKIE_PATH = '/admin';
const REFRESH_COOKIE_PATH = '/admin';

function buildAuthError(message, statusCode = 401, code = 'ADMIN_AUTH_FAILED') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeAdmin(admin) {
  return {
    idAdmin: Number(admin.idAdmin),
    displayName: String(admin.displayName || 'Admin'),
    role: String(admin.role || 'admin'),
  };
}

function normalizeText(value, maxLength) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function buildRefreshExpiryDate() {
  const ttlInDays = Math.max(1, Number(env.ADMIN_REFRESH_TOKEN_TTL_DAYS || 30));
  return new Date(Date.now() + ttlInDays * 24 * 60 * 60 * 1000);
}

function createRefreshTokenValue() {
  return `rt_${crypto.randomBytes(48).toString('base64url')}`;
}

function buildCookieBaseOptions(maxAge, path) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(env.ADMIN_COOKIE_SECURE),
    path,
    maxAge,
  };

  if (env.ADMIN_COOKIE_DOMAIN) {
    options.domain = env.ADMIN_COOKIE_DOMAIN;
  }

  return options;
}

export function getAdminCookieNames() {
  return {
    access: ACCESS_COOKIE_NAME,
    refresh: REFRESH_COOKIE_NAME,
  };
}

export function applyAdminSessionCookies(res, session) {
  res.cookie(
    ACCESS_COOKIE_NAME,
    session.accessToken,
    buildCookieBaseOptions(
      Math.max(60, Number(env.ADMIN_ACCESS_TOKEN_TTL_MINUTES || 15) * 60) * 1000,
      ACCESS_COOKIE_PATH,
    ),
  );

  res.cookie(
    REFRESH_COOKIE_NAME,
    session.refreshToken,
    buildCookieBaseOptions(
      Math.max(1, Number(env.ADMIN_REFRESH_TOKEN_TTL_DAYS || 30)) * 24 * 60 * 60 * 1000,
      REFRESH_COOKIE_PATH,
    ),
  );
}

export function clearAdminAuthCookies(res) {
  const clearBase = {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(env.ADMIN_COOKIE_SECURE),
  };

  if (env.ADMIN_COOKIE_DOMAIN) {
    clearBase.domain = env.ADMIN_COOKIE_DOMAIN;
  }

  res.clearCookie(ACCESS_COOKIE_NAME, { ...clearBase, path: ACCESS_COOKIE_PATH });
  res.clearCookie(REFRESH_COOKIE_NAME, { ...clearBase, path: REFRESH_COOKIE_PATH });
}

async function issueSessionForAdmin(admin, requestMeta = {}) {
  const normalizedAdmin = normalizeAdmin(admin);
  const accessToken = signAdminAccessToken(normalizedAdmin);
  const refreshToken = createRefreshTokenValue();
  const refreshExpiresAt = buildRefreshExpiryDate();

  await createAdminRefreshTokenSession({
    idAdmin: normalizedAdmin.idAdmin,
    rawToken: refreshToken,
    userAgent: normalizeText(requestMeta.userAgent, 255),
    ipAddress: normalizeText(requestMeta.ipAddress, 64),
    expiresAt: refreshExpiresAt.toISOString().slice(0, 19).replace('T', ' '),
  });

  return {
    admin: normalizedAdmin,
    accessToken: accessToken.token,
    accessExpiresAt: accessToken.expiresAt,
    refreshToken,
    refreshExpiresAt: refreshExpiresAt.toISOString(),
  };
}

export async function loginAdminWithAccessKey(accessKey, requestMeta = {}) {
  const normalizedKey = String(accessKey || '').trim();
  if (!normalizedKey) {
    throw buildAuthError('Saisis la clé d’accès admin.', 400, 'ADMIN_ACCESS_KEY_REQUIRED');
  }

  const admin = await findActiveAdminByAccessKey(normalizedKey);
  if (!admin) {
    throw buildAuthError('Clé d’accès invalide.', 401, 'ADMIN_ACCESS_KEY_INVALID');
  }

  await touchAdminLastLogin(admin.idAdmin);
  return issueSessionForAdmin(admin, requestMeta);
}

export async function refreshAdminSession(rawRefreshToken, requestMeta = {}) {
  const refreshToken = String(rawRefreshToken || '').trim();
  if (!refreshToken) {
    throw buildAuthError('Session admin expirée.', 401, 'ADMIN_REFRESH_TOKEN_MISSING');
  }

  const storedSession = await findActiveAdminRefreshToken(refreshToken);
  if (!storedSession) {
    throw buildAuthError('Session admin expirée.', 401, 'ADMIN_REFRESH_TOKEN_INVALID');
  }

  await revokeAdminRefreshTokenById(storedSession.idRefresh);

  return issueSessionForAdmin(
    {
      idAdmin: storedSession.idAdmin,
      displayName: storedSession.displayName,
      role: storedSession.role,
    },
    requestMeta,
  );
}

export async function logoutAdminSession(rawRefreshToken) {
  const refreshToken = String(rawRefreshToken || '').trim();
  if (!refreshToken) return;
  await revokeAdminRefreshToken(refreshToken);
}
