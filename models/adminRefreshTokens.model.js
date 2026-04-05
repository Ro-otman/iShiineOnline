import { execute } from '../config/db.js';

function trimText(value, maxLength) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeSession(row) {
  if (!row) return null;

  return {
    idRefresh: Number(row.id_refresh),
    idAdmin: Number(row.id_admin),
    displayName: String(row.display_name || 'Admin'),
    role: String(row.role || 'admin'),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function createAdminRefreshTokenSession({
  idAdmin,
  rawToken,
  userAgent,
  ipAddress,
  expiresAt,
}) {
  const result = await execute(
    `INSERT INTO admin_refresh_tokens (
       id_admin,
       token_hash,
       user_agent,
       ip_address,
       expires_at,
       created_at
     ) VALUES (
       ?,
       UNHEX(SHA2(?, 256)),
       ?,
       ?,
       ?,
       UTC_TIMESTAMP()
     )`,
    [
      idAdmin,
      rawToken,
      trimText(userAgent, 255),
      trimText(ipAddress, 64),
      expiresAt,
    ],
  );

  return Number(result.insertId || 0);
}

export async function findActiveAdminRefreshToken(rawToken) {
  const rows = await execute(
    `SELECT
        t.id_refresh,
        t.id_admin,
        t.expires_at,
        t.created_at,
        u.display_name,
        u.role
       FROM admin_refresh_tokens t
       INNER JOIN admin_users u ON u.id_admin = t.id_admin
      WHERE t.token_hash = UNHEX(SHA2(?, 256))
        AND t.revoked_at IS NULL
        AND t.expires_at > UTC_TIMESTAMP()
        AND u.is_active = 1
      LIMIT 1`,
    [rawToken],
  );

  return normalizeSession(rows[0]);
}

export async function revokeAdminRefreshTokenById(idRefresh) {
  await execute(
    `UPDATE admin_refresh_tokens
        SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()),
            last_used_at = UTC_TIMESTAMP()
      WHERE id_refresh = ?`,
    [idRefresh],
  );
}

export async function revokeAdminRefreshToken(rawToken) {
  await execute(
    `UPDATE admin_refresh_tokens
        SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP()),
            last_used_at = UTC_TIMESTAMP()
      WHERE token_hash = UNHEX(SHA2(?, 256))
        AND revoked_at IS NULL`,
    [rawToken],
  );
}
