import { env } from '../config/env.js';

const TECHNICAL_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_NO_SUCH_TABLE',
  'INTERNAL_ERROR',
  'DB_ENV_MISSING',
  'DB_SSL_CA_READ_FAILED',
]);

function buildHelpers() {
  return {
    number(value) {
      return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
    },
    money(value) {
      return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
    },
    dateTime(value) {
      if (!value) return 'Non renseigné';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  };
}

function isTechnicalError(err, statusCode) {
  return statusCode >= 500 || TECHNICAL_ERROR_CODES.has(String(err?.code || ''));
}

function getPublicMessage(err, statusCode) {
  if (statusCode === 404) return 'La ressource demandée est introuvable.';
  if (isTechnicalError(err, statusCode)) {
    return 'Une erreur technique est survenue. Réessaie dans un instant.';
  }
  return err?.message || 'Une erreur est survenue.';
}

function wantsJson(req) {
  if (req.originalUrl.startsWith('/api')) return true;
  if (req.xhr) return true;
  const accepted = req.accepts(['html', 'json']);
  return accepted === 'json';
}

function isAdminRequest(req) {
  return req.originalUrl.startsWith('/admin');
}

function renderAdminError(res, statusCode, publicMessage) {
  return res.status(statusCode).render('admin/error', {
    appTitle: env.ADMIN_DASHBOARD_TITLE || 'iShiine Admin',
    page: {
      section: '',
      title: '',
      kicker: '',
      intro: '',
      hideHeading: true,
    },
    data: {
      generatedAt: new Date().toISOString(),
      premiumAmount: Number(env.PREMIUM_AMOUNT || 0),
    },
    helpers: buildHelpers(),
    feedback: { success: '', error: '' },
    form: {},
    errorTitle: statusCode === 404 ? 'Page introuvable' : 'Incident temporaire',
    errorMessage: publicMessage,
    errorStatus: statusCode,
  });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = Number.isFinite(err?.statusCode) ? err.statusCode : 500;
  const publicMessage = getPublicMessage(err, statusCode);

  console.error('[errorHandler]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code: err?.code,
    message: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) {
    return;
  }

  if (isAdminRequest(req) && !wantsJson(req)) {
    return renderAdminError(res, statusCode, publicMessage);
  }

  if (!wantsJson(req)) {
    return res.status(statusCode).send(publicMessage);
  }

  return res.status(statusCode).json({
    ok: false,
    error: {
      code: err?.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR'),
      message: publicMessage,
    },
  });
}
