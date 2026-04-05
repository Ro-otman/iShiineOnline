let realtimeServer = null;

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function getUserChannel(userId) {
  return `user:${asString(userId)}`;
}

export function setRealtimeServer(io) {
  realtimeServer = io || null;
}

export function emitToUser(userId, event, payload) {
  const safeUserId = asString(userId);
  if (!realtimeServer || !safeUserId || !event) return false;
  realtimeServer.to(getUserChannel(safeUserId)).emit(event, payload);
  return true;
}