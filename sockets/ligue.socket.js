import {
  getPresenceIndex,
  joinPresence,
  leavePresenceBySocketId,
  listPresence
} from '../models/liguePresence.model.js';

function broadcast(io, roomId) {
  const participants = listPresence(roomId);
  io.to(roomId).emit('ligue:participants', {
    roomId,
    count: participants.length,
    participants
  });
}

export function registerLigueSockets(io) {
  io.on('connection', (socket) => {
    socket.on('ligue:join', (payload, ack) => {
      try {
        const roomId = String(payload?.roomId ?? '').trim();
        const userId = String(payload?.userId ?? '').trim();
        const fullName = String(payload?.fullName ?? '').trim();
        const photoUrl = payload?.photoUrl ? String(payload.photoUrl) : null;

        if (!roomId || !userId || !fullName) {
          return ack?.({
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'roomId, userId et fullName requis' }
          });
        }

        // Leave previous room (if any)
        const prev = getPresenceIndex(socket.id);
        if (prev && prev.roomId !== roomId) {
          leavePresenceBySocketId(socket.id);
          socket.leave(prev.roomId);
          broadcast(io, prev.roomId);
        }

        socket.join(roomId);

        joinPresence({
          roomId,
          userId,
          fullName,
          photoUrl,
          socketId: socket.id
        });

        broadcast(io, roomId);

        return ack?.({ ok: true });
      } catch (err) {
        return ack?.({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: err?.message || 'Erreur interne' }
        });
      }
    });

    socket.on('ligue:leave', (_payload, ack) => {
      const prev = getPresenceIndex(socket.id);
      if (!prev) return ack?.({ ok: true });

      leavePresenceBySocketId(socket.id);
      socket.leave(prev.roomId);
      broadcast(io, prev.roomId);

      return ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      const prev = getPresenceIndex(socket.id);
      if (!prev) return;

      leavePresenceBySocketId(socket.id);
      broadcast(io, prev.roomId);
    });
  });
}
