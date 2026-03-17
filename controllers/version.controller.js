import { env } from '../config/env.js';

export function getVersion(_req, res) {
  res.json({
    ok: true,
    version: env.APP_VERSION
  });
}
