import fs from 'node:fs';

import mysql from 'mysql2/promise';

import { env } from './env.js';

let pool;

function buildSslConfig() {
  if (!env.DB_SSL) return undefined;

  const ssl = {
    rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED
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
    ssl: buildSslConfig()
  });

  return pool;
}

export async function execute(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function query(sql, params) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}
