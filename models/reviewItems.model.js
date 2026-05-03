import { getPool } from '../config/db.js';

function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asInt(value, fallback = 0) {
  const parsed = Number.parseInt(asString(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeReviewItem(item = {}) {
  const idQuiz = asInt(item.idQuiz || item.id_quiz);
  const nextReviewAt = asString(item.nextReviewAt || item.next_review_at);
  if (!idQuiz || !nextReviewAt) return null;

  return {
    idQuiz,
    nextReviewAt,
    intervalDays: Math.max(1, asInt(item.intervalDays || item.interval_days, 1)),
    easiness: asNumber(item.easiness, 2.5),
    repetition: Math.max(0, asInt(item.repetition, 0)),
    lastResult: item.lastResult ?? item.last_result ?? null,
  };
}

export async function syncReviewItemsForUser({
  userId,
  items = [],
  replace = true,
} = {}) {
  const safeUserId = asString(userId);
  if (!safeUserId) {
    return { receivedCount: 0, syncedCount: 0, deletedCount: 0 };
  }

  const normalizedItems = Array.isArray(items)
    ? items.map((item) => normalizeReviewItem(item)).filter(Boolean)
    : [];
  const uniqueItems = [...new Map(normalizedItems.map((item) => [item.idQuiz, item])).values()];

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    let syncedCount = 0;
    for (const item of uniqueItems) {
      const [result] = await connection.execute(
        `
          INSERT INTO review_items (
            id_user,
            id_quiz,
            next_review_at,
            interval_days,
            easiness,
            repetition,
            last_result
          )
          SELECT ?, q.id_quiz, ?, ?, ?, ?, ?
          FROM quiz q
          WHERE q.id_quiz = ?
          ON DUPLICATE KEY UPDATE
            next_review_at = VALUES(next_review_at),
            interval_days = VALUES(interval_days),
            easiness = VALUES(easiness),
            repetition = VALUES(repetition),
            last_result = VALUES(last_result)
        `,
        [
          safeUserId,
          item.nextReviewAt,
          item.intervalDays,
          item.easiness,
          item.repetition,
          item.lastResult,
          item.idQuiz,
        ],
      );
      if (Number(result?.affectedRows || 0) > 0) {
        syncedCount += 1;
      }
    }

    let deletedCount = 0;
    if (replace) {
      if (uniqueItems.length === 0) {
        const [deleteResult] = await connection.execute(
          'DELETE FROM review_items WHERE id_user = ?',
          [safeUserId],
        );
        deletedCount = Number(deleteResult?.affectedRows || 0);
      } else {
        const quizIds = uniqueItems.map((item) => item.idQuiz);
        const placeholders = quizIds.map(() => '?').join(', ');
        const [deleteResult] = await connection.execute(
          `
            DELETE FROM review_items
            WHERE id_user = ?
              AND id_quiz NOT IN (${placeholders})
          `,
          [safeUserId, ...quizIds],
        );
        deletedCount = Number(deleteResult?.affectedRows || 0);
      }
    }

    await connection.commit();
    return {
      receivedCount: normalizedItems.length,
      syncedCount,
      deletedCount,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    connection.release();
  }
}
