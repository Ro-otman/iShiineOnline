import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool;

const TRANSIENT_DB_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
]);

function buildSslConfig() {
  if (!env.DB_SSL) return undefined;

  const ssl = {
    rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED,
  };
  if (env.DB_SSL_CA_PATH) {
    try {
      ssl.ca = fs.readFileSync(env.DB_SSL_CA_PATH, 'utf8');
    } catch (err) {
      const e = new Error(`Impossible de lire DB_SSL_CA_PATH: ${env.DB_SSL_CA_PATH}`);
      e.statusCode = 500;
      e.code = 'DB_SSL_CA_READ_FAILED';
      e.details = { originalMessage: err?.message };
      throw e;
    }
  }
  return ssl;
}

function shouldRetryDbError(err) {
  return TRANSIENT_DB_CODES.has(String(err?.code || ''));
}

function logDbFailure(scope, err) {
  if (!env.DB_DEBUG) return;
  console.error(`[db] ${scope} failed`, {
    code: err?.code,
    message: err?.message,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    database: env.DB_NAME,
  });
}

function markDbError(err) {
  if (!err.statusCode || err.statusCode < 500) {
    err.statusCode = 503;
  }
  if (!err.code) {
    err.code = 'DB_UNAVAILABLE';
  }
  return err;
}

async function resetPool() {
  const current = pool;
  pool = undefined;
  if (!current) return;
  try {
    await current.end();
  } catch (_error) {
    // ignore cleanup failures on broken sockets
  }
}

export function getPool() {
  if (pool) return pool;

  const missing = [];
  if (!env.DB_HOST) missing.push('DB_HOST');
  if (!env.DB_USER) missing.push('DB_USER');
  if (!env.DB_NAME) missing.push('DB_NAME');

  if (missing.length > 0) {
    const err = new Error(`MySQL env not set: ${missing.join(', ')}`);
    err.statusCode = 500;
    err.code = 'DB_ENV_MISSING';
    throw err;
  }
  if (env.DB_DEBUG) {
    console.log('[db] creating MySQL pool', {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      database: env.DB_NAME,
      passwordSet: Boolean(env.DB_PASSWORD),
      ssl: Boolean(env.DB_SSL),
      sslRejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED,
      sslCaPathSet: Boolean(env.DB_SSL_CA_PATH),
      connectionLimit: env.DB_CONNECTION_LIMIT,
    });
  }
  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    namedPlaceholders: true,
    timezone: 'Z',
    charset: 'utf8mb4',
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 15000,
    ssl: buildSslConfig(),
  });

  return pool;
}

async function runWithRetry(method, sql, params) {
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const activePool = getPool();
      const [rows] = await activePool[method](sql, params);
      return rows;
    } catch (err) {
      lastError = err;
      logDbFailure(`${method} attempt ${attempt + 1}`, err);
      if (attempt === 0 && shouldRetryDbError(err)) {
        await resetPool();
        continue;
      }
      break;
    }
  }

  throw markDbError(lastError);
}

export async function execute(sql, params) {
  return runWithRetry('execute', sql, params);
}

export async function query(sql, params) {
  return runWithRetry('query', sql, params);
}
