import { env } from '../config/env.js';
import { execute } from '../config/db.js';

export function getHealth(_req, res) {
  res.json({
    ok: true,
    service: 'ishiine-online',
    version: env.APP_VERSION,
    time: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
}

export async function getDbHealth(_req, res, next) {
  try {
    const startedAt = Date.now();
    await execute('SELECT 1 AS ok', []);
    const durationMs = Date.now() - startedAt;

    res.json({
      ok: true,
      db: {
        ok: true,
        durationMs
      }
    });
  } catch (err) {
    next(err);
  }
}
