import { refreshAdminSession, applyAdminSessionCookies, clearAdminAuthCookies, getAdminCookieNames } from '../services/adminAuth.service.js';
import { verifyAdminAccessToken } from '../services/adminJwt.service.js';
import { parseRequestCookies } from '../utils/httpCookies.js';

function wantsJson(req) {
  if (req.xhr) return true;
  if (req.originalUrl.startsWith('/api')) return true;
  const accepted = req.accepts(['html', 'json']);
  return accepted === 'json';
}

function sanitizeReturnTo(value) {
  const normalized = String(value || '').trim();
  if (!normalized.startsWith('/admin')) return '/admin';
  if (normalized.startsWith('/admin/login')) return '/admin';
  if (normalized.startsWith('/admin/auth/')) return '/admin';
  return normalized;
}

function getRequestMeta(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    userAgent: String(req.headers['user-agent'] || '').trim(),
    ipAddress: forwardedFor || req.ip || req.socket?.remoteAddress || '',
  };
}

function respondUnauthorized(req, res) {
  if (wantsJson(req)) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'ADMIN_AUTH_REQUIRED',
        message: 'Connexion admin requise.',
      },
    });
  }

  const returnTo = sanitizeReturnTo(req.originalUrl);
  return res.redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
}

async function resolveAdminSession(req, res) {
  const cookies = parseRequestCookies(req);
  const cookieNames = getAdminCookieNames();
  const accessToken = cookies[cookieNames.access];

  if (accessToken) {
    try {
      return verifyAdminAccessToken(accessToken);
    } catch (_error) {
      // fall through to refresh token flow
    }
  }

  const refreshToken = cookies[cookieNames.refresh];
  if (!refreshToken) return null;

  try {
    const session = await refreshAdminSession(refreshToken, getRequestMeta(req));
    applyAdminSessionCookies(res, session);
    return session.admin;
  } catch (_error) {
    clearAdminAuthCookies(res);
    return null;
  }
}

export async function requireAdminDashboardAuth(req, res, next) {
  try {
    const admin = await resolveAdminSession(req, res);
    if (!admin) {
      return respondUnauthorized(req, res);
    }

    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function redirectAuthenticatedAdmin(req, res, next) {
  try {
    const admin = await resolveAdminSession(req, res);
    if (admin) {
      return res.redirect('/admin');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
