import crypto from 'node:crypto';

import { upsertUser } from '../models/users.model.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

export async function registerToLigue(req, res, next) {
  try {
    const body = req.body || {};

    const id_users = asString(body.id_users || body.id_user).trim() || crypto.randomUUID();
    const nom = asString(body.nom).trim();
    const prenoms = asString(body.prenoms).trim();
    const email = asString(body.email).trim();
    const classe = asString(body.classe).trim();
    const phone = asString(body.phone).trim();

    if (!nom || !prenoms || !classe || !phone) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Champs requis: nom, prenoms, classe, phone'
        }
      });
    }

    const img_path = req.file ? `/uploads/users/${req.file.filename}` : null;

    const user = await upsertUser({
      id_users,
      nom,
      prenoms,
      email,
      classe,
      phone,
      img_path,
      is_subscribed: Number(body.is_subscribed ?? 0) ? 1 : 0,
      subscription_date: body.subscription_date ? asString(body.subscription_date) : null,
      subscription_expiry: body.subscription_expiry ? asString(body.subscription_expiry) : null,
      first_use_time: body.first_use_time ? asString(body.first_use_time) : null
    });

    return res.status(201).json({
      ok: true,
      user
    });
  } catch (err) {
    return next(err);
  }
}
