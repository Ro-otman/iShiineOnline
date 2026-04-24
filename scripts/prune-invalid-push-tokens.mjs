import { execute } from '../config/db.js';
import { getFirebaseMessagingClient } from '../services/firebaseAdmin.service.js';

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function chunk(list, size) {
  const batches = [];
  for (let index = 0; index < list.length; index += size) {
    batches.push(list.slice(index, index + size));
  }
  return batches;
}

async function listActiveTokens() {
  return execute(
    `
      SELECT id_token, id_user, fcm_token, platform, app_version, updated_at
      FROM device_push_tokens
      WHERE is_active = 1
      ORDER BY updated_at DESC, id_token DESC
    `,
    [],
  );
}

async function deactivateTokens(tokens = []) {
  if (tokens.length === 0) return 0;

  const placeholders = tokens.map(() => '?').join(', ');
  const result = await execute(
    `
      UPDATE device_push_tokens
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE fcm_token IN (${placeholders})
    `,
    tokens,
  );

  return Number(result?.affectedRows || 0);
}

async function validateBatch(messaging, batch) {
  const messages = batch.map((row, index) => ({
    token: asString(row.fcm_token),
    notification: {
      title: 'iShiine diagnostic',
      body: `Validation FCM ${index + 1}`,
    },
    data: {
      source: 'prune-invalid-push-tokens',
      tokenId: asString(row.id_token),
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
      },
    },
  }));

  const response = await messaging.sendEach(messages, true);
  const invalidTokens = [];

  response.responses.forEach((item, index) => {
    if (!item.success && INVALID_TOKEN_CODES.has(asString(item.error?.code))) {
      invalidTokens.push(asString(batch[index]?.fcm_token));
    }
  });

  return {
    tested: batch.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}

try {
  const rows = await listActiveTokens();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(JSON.stringify({ ok: true, tested: 0, activeTokens: 0, pruned: 0 }));
    process.exit(0);
  }

  const messaging = getFirebaseMessagingClient();
  const batches = chunk(rows, 500);

  let tested = 0;
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = new Set();

  for (const batch of batches) {
    const result = await validateBatch(messaging, batch);
    tested += result.tested;
    successCount += result.successCount;
    failureCount += result.failureCount;
    result.invalidTokens.forEach((token) => {
      if (token) invalidTokens.add(token);
    });
  }

  const pruned = await deactivateTokens([...invalidTokens]);

  console.log(
    JSON.stringify({
      ok: true,
      activeTokens: rows.length,
      tested,
      successCount,
      failureCount,
      invalidDetected: invalidTokens.size,
      pruned,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      code: error?.code || null,
      message: error?.message || 'Unknown error',
    }),
  );
  process.exit(1);
}
