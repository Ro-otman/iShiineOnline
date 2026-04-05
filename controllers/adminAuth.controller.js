import { env } from '../config/env.js';
import {
  applyAdminSessionCookies,
  clearAdminAuthCookies,
  getAdminCookieNames,
  loginAdminWithAccessKey,
  logoutAdminSession,
} from '../services/adminAuth.service.js';
import { parseRequestCookies } from '../utils/httpCookies.js';

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

function renderLoginView(res, { statusCode = 200, feedback = {}, form = {} } = {}) {
  return res.status(statusCode).render('admin/login', {
    appTitle: env.ADMIN_DASHBOARD_TITLE || 'iShiine Admin',
    feedback: {
      success: String(feedback.success || '').trim(),
      error: String(feedback.error || '').trim(),
    },
    form: {
      accessKey: String(form.accessKey || '').trim(),
      returnTo: sanitizeReturnTo(form.returnTo || '/admin'),
    },
  });
}

export async function renderAdminLogin(req, res) {
  return renderLoginView(res, {
    feedback: {
      success: req.query?.loggedOut ? 'Déconnexion effectuée.' : '',
      error: req.query?.error || '',
    },
    form: {
      accessKey: '',
      returnTo: sanitizeReturnTo(req.query?.returnTo || '/admin'),
    },
  });
}

export async function loginAdmin(req, res, next) {
  const accessKey = String(req.body?.access_key || '').trim();
  const returnTo = sanitizeReturnTo(req.body?.return_to || req.query?.returnTo || '/admin');

  try {
    const session = await loginAdminWithAccessKey(accessKey, getRequestMeta(req));
    applyAdminSessionCookies(res, session);
    return res.redirect(returnTo);
  } catch (error) {
    if (Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500) {
      return renderLoginView(res, {
        statusCode: Number(error.statusCode) || 401,
        feedback: { error: error.message },
        form: { accessKey: '', returnTo },
      });
    }

    return next(error);
  }
}

export async function logoutAdmin(req, res, next) {
  try {
    const cookies = parseRequestCookies(req);
    const cookieNames = getAdminCookieNames();
    await logoutAdminSession(cookies[cookieNames.refresh]);
    clearAdminAuthCookies(res);
    return res.redirect('/admin/login?loggedOut=1');
  } catch (error) {
    return next(error);
  }
}
