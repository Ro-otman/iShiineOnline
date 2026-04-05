import { execute } from '../config/db.js';

let ensurePushTokensTablePromise = null;

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asNullableText(value) {
  const text = asString(value);
  return text || null;
}

export async function ensurePushTokensTable() {
  if (!ensurePushTokensTablePromise) {
    ensurePushTokensTablePromise = execute(
      `
        CREATE TABLE IF NOT EXISTS device_push_tokens (
          id_token BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          id_user VARCHAR(255) NOT NULL,
          fcm_token VARCHAR(255) NOT NULL,
          platform VARCHAR(32) NULL,
          app_version VARCHAR(64) NULL,
          device_label VARCHAR(120) NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id_token),
          UNIQUE KEY uq_device_push_tokens_fcm (fcm_token),
          KEY idx_device_push_tokens_user_active (id_user, is_active, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `,
      [],
    ).catch((error) => {
      ensurePushTokensTablePromise = null;
      throw error;
    });
  }
  return ensurePushTokensTablePromise;
}

export async function upsertDevicePushToken({
  userId,
  fcmToken,
  platform,
  appVersion,
  deviceLabel,
} = {}) {
  const safeUserId = asString(userId);
  const safeToken = asString(fcmToken);
  if (!safeUserId || !safeToken) return null;
  await ensurePushTokensTable();

  await execute(
    `
      INSERT INTO device_push_tokens (
        id_user,
        fcm_token,
        platform,
        app_version,
        device_label,
        is_active,
        last_seen_at
      ) VALUES (?, ?, ?, ?, ?, 1, UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE
        id_user = VALUES(id_user),
        platform = COALESCE(NULLIF(VALUES(platform), ''), platform),
        app_version = COALESCE(NULLIF(VALUES(app_version), ''), app_version),
        device_label = COALESCE(NULLIF(VALUES(device_label), ''), device_label),
        is_active = 1,
        last_seen_at = UTC_TIMESTAMP(),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      safeUserId,
      safeToken,
      asNullableText(platform),
      asNullableText(appVersion),
      asNullableText(deviceLabel),
    ],
  );

  const rows = await execute(
    `
      SELECT *
      FROM device_push_tokens
      WHERE fcm_token = ?
      LIMIT 1
    `,
    [safeToken],
  );
  return rows[0] ?? null;
}

export async function deactivateDevicePushToken(fcmToken) {
  const safeToken = asString(fcmToken);
  if (!safeToken) return 0;
  await ensurePushTokensTable();

  const result = await execute(
    `
      UPDATE device_push_tokens
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE fcm_token = ?
    `,
    [safeToken],
  );
  return Number(result?.affectedRows || 0);
}

export async function listActiveDevicePushTokensByUser(userId) {
  const safeUserId = asString(userId);
  if (!safeUserId) return [];
  await ensurePushTokensTable();

  return execute(
    `
      SELECT *
      FROM device_push_tokens
      WHERE id_user = ? AND is_active = 1
      ORDER BY updated_at DESC, id_token DESC
      LIMIT 50
    `,
    [safeUserId],
  );
}