import { verifyUserAccessToken } from '../services/userJwt.service.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function buildAuthError(message, statusCode = 401, code = 'USER_AUTH_REQUIRED') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function readBearerToken(req) {
  const header = asString(req.headers?.authorization);
  if (!header) return '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? '';
}

function attachUser(req, session) {
  req.user = {
    idUser: session.idUser,
    expiresAt: session.expiresAt,
  };
}

export function readUserAccessToken(req) {
  return readBearerToken(req);
}

export function requireUserAuth(req, _res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw buildAuthError(
        'Connexion utilisateur requise.',
        401,
        'USER_AUTH_REQUIRED',
      );
    }

    attachUser(req, verifyUserAccessToken(token));
    return next();
  } catch (error) {
    return next(error);
  }
}

export function optionalUserAuth(req, _res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) return next();
    attachUser(req, verifyUserAccessToken(token));
    return next();
  } catch (error) {
    return next(error);
  }
}
