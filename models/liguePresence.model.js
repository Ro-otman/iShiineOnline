const presenceByRoomId = new Map();
const socketIndex = new Map();

function getRoomMap(roomId) {
  if (!presenceByRoomId.has(roomId)) presenceByRoomId.set(roomId, new Map());
  return presenceByRoomId.get(roomId);
}

function serializeRoom(roomMap) {
  const participants = Array.from(roomMap.values()).map(({ socketIds: _socketIds, ...rest }) => rest);
  participants.sort((a, b) => String(a.joinedAt).localeCompare(String(b.joinedAt)));
  return participants;
}

export function listPresence(roomId) {
  const roomMap = presenceByRoomId.get(String(roomId));
  if (!roomMap) return [];
  return serializeRoom(roomMap);
}

export function joinPresence({ roomId, userId, fullName, photoUrl = null, socketId }) {
  const safeRoomId = String(roomId);
  const safeUserId = String(userId);

  const roomMap = getRoomMap(safeRoomId);

  const existing = roomMap.get(safeUserId);
  const entry = existing ?? {
    userId: safeUserId,
    fullName: String(fullName),
    photoUrl: photoUrl ? String(photoUrl) : null,
    joinedAt: new Date().toISOString(),
    socketIds: new Set()
  };

  entry.fullName = String(fullName);
  if (photoUrl !== undefined) {
    entry.photoUrl = photoUrl ? String(photoUrl) : null;
  }

  entry.socketIds.add(String(socketId));
  roomMap.set(safeUserId, entry);

  socketIndex.set(String(socketId), { roomId: safeRoomId, userId: safeUserId });

  return serializeRoom(roomMap);
}

export function leavePresenceBySocketId(socketId) {
  const idx = socketIndex.get(String(socketId));
  if (!idx) return null;

  const { roomId, userId } = idx;

  const roomMap = presenceByRoomId.get(roomId);
  if (!roomMap) {
    socketIndex.delete(String(socketId));
    return [];
  }

  const entry = roomMap.get(userId);
  if (!entry) {
    socketIndex.delete(String(socketId));
    return serializeRoom(roomMap);
  }

  entry.socketIds.delete(String(socketId));

  if (entry.socketIds.size === 0) {
    roomMap.delete(userId);
  } else {
    roomMap.set(userId, entry);
  }

  if (roomMap.size === 0) {
    presenceByRoomId.delete(roomId);
  }

  socketIndex.delete(String(socketId));

  return roomMap.size === 0 ? [] : serializeRoom(roomMap);
}

export function getPresenceIndex(socketId) {
  return socketIndex.get(String(socketId)) ?? null;
}
