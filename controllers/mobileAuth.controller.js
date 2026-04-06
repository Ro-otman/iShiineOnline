import {
  getUserById,
  getUserByIdentity,
  rekeyUserId,
  upsertUserProfile,
} from '../models/users.model.js';
import { signUserAccessToken } from '../services/userJwt.service.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeEmail(value) {
  return asString(value).toLowerCase();
}

function normalizePhone(value) {
  return asString(value).replaceAll(/\s+/g, '');
}

function buildError(message, statusCode = 400, code = 'BAD_REQUEST') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function serializeUser(user) {
  return {
    id_user: asString(user?.id_users),
    nom: asString(user?.nom),
    prenoms: asString(user?.prenoms),
    email: asString(user?.email),
    classe: asString(user?.classe),
    phone: asString(user?.phone),
    img_path: asString(user?.img_path) || null,
    is_subscribed: Number(user?.is_subscribed) === 1,
    subscription_expiry: user?.subscription_expiry
      ? new Date(user.subscription_expiry).toISOString()
      : null,
  };
}

function buildProfileFromBody(body, fallbackUser = null) {
  return {
    nom: asString(body.nom || fallbackUser?.nom),
    prenoms: asString(body.prenoms || fallbackUser?.prenoms),
    email: asString(body.email || fallbackUser?.email),
    classe: asString(body.classe || fallbackUser?.classe),
    phone: asString(body.phone || fallbackUser?.phone),
    img_path: fallbackUser?.img_path || null,
    is_subscribed: Number(fallbackUser?.is_subscribed ?? 0) ? 1 : 0,
    subscription_date: fallbackUser?.subscription_date
      ? asString(fallbackUser.subscription_date)
      : null,
    subscription_expiry: fallbackUser?.subscription_expiry
      ? asString(fallbackUser.subscription_expiry)
      : null,
    first_use_time: body.first_use_time
      ? asString(body.first_use_time)
      : (fallbackUser?.first_use_time ? asString(fallbackUser.first_use_time) : null),
  };
}

function matchesExistingIdentity(user, { email, phone }) {
  const safeEmail = normalizeEmail(email);
  const safePhone = normalizePhone(phone);
  const userEmail = normalizeEmail(user?.email);
  const userPhone = normalizePhone(user?.phone);
  if (!safeEmail && !safePhone) return false;
  return (
    (safeEmail && userEmail && safeEmail === userEmail) ||
    (safePhone && userPhone && safePhone === userPhone)
  );
}

export async function createMobileSession(req, res, next) {
  try {
    const body = req.body || {};
    const requestedUserId = asString(
      body.id_users || body.id_user || body.userId,
    );

    if (!requestedUserId) {
      throw buildError('id_users requis pour établir la session.', 400, 'USER_ID_REQUIRED');
    }

    let user = null;

    if (req.user?.idUser) {
      if (req.user.idUser !== requestedUserId) {
        throw buildError(
          'La session mobile ne correspond pas à cet utilisateur.',
          403,
          'USER_ID_MISMATCH',
        );
      }
      user = await getUserById(req.user.idUser);
      if (!user) {
        throw buildError('Utilisateur introuvable.', 404, 'USER_NOT_FOUND');
      }
    } else {
      user = await getUserById(requestedUserId);
      if (user) {
        if (!matchesExistingIdentity(user, body)) {
          throw buildError(
            'Impossible de restaurer cette session sans identité correspondante.',
            403,
            'USER_IDENTITY_MISMATCH',
          );
        }
      } else {
        const matchedUser = await getUserByIdentity({
          email: body.email,
          phone: body.phone,
        });
        if (matchedUser?.id_users && matchedUser.id_users !== requestedUserId) {
          await rekeyUserId({
            fromUserId: matchedUser.id_users,
            toUserId: requestedUserId,
          });
          user = await getUserById(requestedUserId);
        }
      }
    }

    const profile = buildProfileFromBody(body, user);
    if (!profile.nom || !profile.prenoms || !profile.classe || !profile.phone) {
      throw buildError(
        'Champs requis: nom, prenoms, classe, phone.',
        400,
        'PROFILE_REQUIRED',
      );
    }

    user = await upsertUserProfile({
      id_users: requestedUserId,
      ...profile,
    });

    const access = signUserAccessToken(user);

    return res.status(req.user?.idUser ? 200 : 201).json({
      ok: true,
      user: serializeUser(user),
      access_token: access.token,
      expires_at: access.expiresAt,
      expires_in_seconds: access.expiresInSeconds,
    });
  } catch (error) {
    return next(error);
  }
}
