import { env } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  const statusCode = Number.isFinite(err?.statusCode) ? err.statusCode : 500;
  const message = err?.message || 'Erreur interne';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      code: err?.code || 'INTERNAL_ERROR',
      message,
      details: env.NODE_ENV === 'production' ? undefined : err?.details,
      stack: env.NODE_ENV === 'production' ? undefined : err?.stack
    }
  });
}
