import { execute } from '../config/db.js';

function normalizeAdmin(row) {
  if (!row) return null;

  return {
    idAdmin: Number(row.id_admin),
    displayName: String(row.display_name || 'Admin'),
    role: String(row.role || 'admin'),
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export async function findActiveAdminByAccessKey(accessKey) {
  const rows = await execute(
    `SELECT id_admin, display_name, role, is_active, last_login_at, created_at
       FROM admin_users
      WHERE access_key_hash = UNHEX(SHA2(?, 256))
        AND is_active = 1
      LIMIT 1`,
    [accessKey],
  );

  return normalizeAdmin(rows[0]);
}

export async function findAdminById(idAdmin) {
  const rows = await execute(
    `SELECT id_admin, display_name, role, is_active, last_login_at, created_at
       FROM admin_users
      WHERE id_admin = ?
      LIMIT 1`,
    [idAdmin],
  );

  return normalizeAdmin(rows[0]);
}

export async function touchAdminLastLogin(idAdmin) {
  await execute(
    `UPDATE admin_users
        SET last_login_at = UTC_TIMESTAMP()
      WHERE id_admin = ?
      LIMIT 1`,
    [idAdmin],
  );
}
