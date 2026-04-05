import fs from 'node:fs';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

import { env } from '../config/env.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizePrivateKey(value) {
  return asString(value).replace(/\\n/g, '\n');
}

function resolveServiceAccount() {
  const directJson = asString(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (directJson) {
    const parsed = parseJson(directJson);
    if (parsed) return parsed;
  }

  const base64Json = asString(env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  if (base64Json) {
    const parsed = parseJson(Buffer.from(base64Json, 'base64').toString('utf8'));
    if (parsed) return parsed;
  }

  const serviceAccountPath = asString(env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const parsed = parseJson(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (parsed) return parsed;
  }

  const projectId = asString(env.FIREBASE_PROJECT_ID);
  const clientEmail = asString(env.FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

export function isFirebasePushConfigured() {
  return resolveServiceAccount() != null;
}

function getFirebaseApp() {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) {
    const error = new Error('Configuration Firebase Admin absente.');
    error.code = 'FIREBASE_CONFIG_MISSING';
    error.statusCode = 500;
    throw error;
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || serviceAccount.projectId || env.FIREBASE_PROJECT_ID || undefined,
  });
}

export function getFirebaseMessagingClient() {
  return getMessaging(getFirebaseApp());
}