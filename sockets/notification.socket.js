import { getUserChannel } from '../services/realtimeGateway.service.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function registerNotificationSockets(io) {
  io.on('connection', (socket) => {
    let activeUserId = null;

    socket.on('notifications:subscribe', (payload, ack) => {
      const userId = asString(payload?.userId);
      if (!userId) {
        return ack?.({
          ok: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'userId requis.',
          },
        });
      }

      if (activeUserId && activeUserId !== userId) {
        socket.leave(getUserChannel(activeUserId));
      }

      activeUserId = userId;
      socket.join(getUserChannel(userId));
      return ack?.({ ok: true, userId });
    });

    socket.on('notifications:unsubscribe', (_payload, ack) => {
      if (activeUserId) {
        socket.leave(getUserChannel(activeUserId));
        activeUserId = null;
      }
      return ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      if (activeUserId) {
        socket.leave(getUserChannel(activeUserId));
        activeUserId = null;
      }
    });
  });
}