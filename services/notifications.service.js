import {
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '../models/notifications.model.js';
import { emitToUser } from './realtimeGateway.service.js';
import { sendPushNotificationToUser } from './pushNotifications.service.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeCategory(value) {
  const normalized = asString(value).toLowerCase();
  if (['success', 'warning', 'error'].includes(normalized)) {
    return normalized;
  }
  return 'info';
}

function parsePayload(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toIsoDateTime(value) {
  const text = asString(value);
  if (!text) return null;
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toNotificationDto(row = {}) {
  return {
    id: asString(row.id_notification),
    userId: asString(row.id_user),
    category: normalizeCategory(row.category),
    title: asString(row.title),
    message: asString(row.message),
    isRead: Number(row.is_read || 0) === 1,
    readAt: toIsoDateTime(row.read_at),
    createdAt: toIsoDateTime(row.created_at),
    payload: parsePayload(row.payload_json),
  };
}

function formatDateFr(value) {
  const iso = toIsoDateTime(value);
  if (!iso) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export async function pushNotification(input = {}) {
  const row = await createNotification(input);
  if (!row) return null;
  const notification = toNotificationDto(row);
  emitToUser(notification.userId, 'notifications:new', { notification });
  return notification;
}

export async function listUserNotifications({
  userId,
  unreadOnly = false,
  limit = 20,
} = {}) {
  const rows = await listNotificationsForUser({ userId, unreadOnly, limit });
  return rows.map((row) => toNotificationDto(row));
}

export async function acknowledgeNotification({ notificationId, userId } = {}) {
  const row = await markNotificationRead({ notificationId, userId });
  return row ? toNotificationDto(row) : null;
}

export async function acknowledgeAllNotifications({ userId } = {}) {
  const updatedCount = await markAllNotificationsRead({ userId });
  return { updatedCount };
}

export async function notifyPaymentSuccess({
  userId,
  transactionId,
  amount,
  currencyIso = 'XOF',
  planKey = 'premium_monthly',
  subscriptionExpiry,
} = {}) {
  const safeUserId = asString(userId);
  const safeTransactionId = asString(transactionId);
  if (!safeUserId || !safeTransactionId) return null;

  const expiryLabel = formatDateFr(subscriptionExpiry);
  const amountLabel = Number.isFinite(Number(amount)) ? Number(amount).toLocaleString('fr-FR') : null;
  const messageParts = [];
  if (amountLabel) {
    messageParts.push(`Paiement confirmÃ© : ${amountLabel} ${asString(currencyIso) || 'F CFA'}.`);
  }
  messageParts.push(
    expiryLabel
      ? `Ton abonnement premium est actif jusqu'au ${expiryLabel}.`
      : 'Ton abonnement premium est maintenant actif.',
  );

  return pushNotification({
    userId: safeUserId,
    category: 'success',
    title: 'Abonnement activÃ©',
    message: messageParts.join(' '),
    dedupeKey: `payment-success:${safeTransactionId}`,
    payload: {
      transactionId: safeTransactionId,
      amount,
      currencyIso,
      planKey,
      subscriptionExpiry: subscriptionExpiry || null,
    },
  });
}