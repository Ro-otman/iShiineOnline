import { execute } from '../config/db.js';

function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

export async function listWeeklyChallenges({ weekKey, userId }) {
  const challenges = await execute(
    `
      SELECT
        c.id_challenge,
        c.week_key,
        c.title,
        c.prompt,
        c.subject,
        c.difficulty,
        c.author_name,
        c.author_verified_blue,
        c.reward_points,
        c.base_participants + (
          SELECT COUNT(*)
          FROM ligue_challenge_submissions s
          WHERE s.id_challenge = c.id_challenge
            AND s.week_key = c.week_key
        ) AS participants,
        c.estimated_minutes,
        c.deadline_at,
        c.featured,
        c.sort_order,
        (
          SELECT COUNT(*)
          FROM ligue_challenge_likes l
          WHERE l.id_challenge = c.id_challenge
        ) AS likes,
        EXISTS(
          SELECT 1
          FROM ligue_challenge_likes l2
          WHERE l2.id_challenge = c.id_challenge
            AND l2.id_user = ?
        ) AS liked_by_me
      FROM ligue_challenges c
      WHERE c.week_key = ?
        AND c.is_active = 1
      ORDER BY c.featured DESC, c.sort_order ASC, c.id_challenge ASC
    `,
    [userId, weekKey],
  );

  if (!challenges.length) {
    return [];
  }

  const ids = challenges.map((challenge) => Number(challenge.id_challenge));
  const placeholders = buildInClause(ids);

  const comments = await execute(
    `
      SELECT
        id_comment,
        id_challenge,
        author_name,
        verified_blue,
        text,
        created_at
      FROM ligue_challenge_comments
      WHERE id_challenge IN (${placeholders})
      ORDER BY created_at DESC, id_comment DESC
    `,
    ids,
  );

  const submissions = userId
    ? await execute(
        `
          SELECT
            id_challenge,
            status,
            answer_text,
            updated_at
          FROM ligue_challenge_submissions
          WHERE id_user = ?
            AND week_key = ?
            AND id_challenge IN (${placeholders})
        `,
        [userId, weekKey, ...ids],
      )
    : [];

  const commentsByChallenge = new Map();
  for (const comment of comments) {
    const key = Number(comment.id_challenge);
    const list = commentsByChallenge.get(key) ?? [];
    list.push(comment);
    commentsByChallenge.set(key, list);
  }

  const submissionsByChallenge = new Map();
  for (const submission of submissions) {
    submissionsByChallenge.set(Number(submission.id_challenge), submission);
  }

  return challenges.map((challenge) => ({
    ...challenge,
    comments: commentsByChallenge.get(Number(challenge.id_challenge)) ?? [],
    submission: submissionsByChallenge.get(Number(challenge.id_challenge)) ?? null,
  }));
}

export async function getChallengeById(idChallenge) {
  const rows = await execute(
    `
      SELECT *
      FROM ligue_challenges
      WHERE id_challenge = ?
      LIMIT 1
    `,
    [idChallenge],
  );
  return rows[0] ?? null;
}

export async function toggleChallengeLike({ idChallenge, userId }) {
  const existing = await execute(
    `
      SELECT id_challenge, id_user
      FROM ligue_challenge_likes
      WHERE id_challenge = ? AND id_user = ?
      LIMIT 1
    `,
    [idChallenge, userId],
  );

  if (existing.length) {
    await execute(
      'DELETE FROM ligue_challenge_likes WHERE id_challenge = ? AND id_user = ?',
      [idChallenge, userId],
    );
  } else {
    await execute(
      `
        INSERT INTO ligue_challenge_likes (
          id_challenge,
          id_user,
          created_at
        ) VALUES (?, ?, UTC_TIMESTAMP())
      `,
      [idChallenge, userId],
    );
  }

  const rows = await execute(
    `
      SELECT
        COUNT(*) AS likes,
        EXISTS(
          SELECT 1
          FROM ligue_challenge_likes
          WHERE id_challenge = ? AND id_user = ?
        ) AS liked_by_me
      FROM ligue_challenge_likes
      WHERE id_challenge = ?
    `,
    [idChallenge, userId, idChallenge],
  );

  return rows[0] ?? { likes: 0, liked_by_me: 0 };
}

export async function createChallengeComment({
  idChallenge,
  userId,
  authorName,
  verifiedBlue,
  text,
}) {
  await execute(
    `
      INSERT INTO ligue_challenge_comments (
        id_challenge,
        id_user,
        author_name,
        verified_blue,
        text,
        created_at
      ) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
    `,
    [idChallenge, userId || null, authorName, verifiedBlue ? 1 : 0, text],
  );

  const rows = await execute(
    `
      SELECT
        id_comment,
        id_challenge,
        author_name,
        verified_blue,
        text,
        created_at
      FROM ligue_challenge_comments
      WHERE id_challenge = ?
      ORDER BY id_comment DESC
      LIMIT 1
    `,
    [idChallenge],
  );

  return rows[0] ?? null;
}

export async function upsertChallengeSubmission({
  idChallenge,
  userId,
  weekKey,
  answerText,
  status,
}) {
  await execute(
    `
      INSERT INTO ligue_challenge_submissions (
        id_challenge,
        id_user,
        week_key,
        answer_text,
        status,
        completed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE
        answer_text = VALUES(answer_text),
        status = VALUES(status),
        completed_at = VALUES(completed_at),
        updated_at = UTC_TIMESTAMP()
    `,
    [
      idChallenge,
      userId,
      weekKey,
      answerText,
      status,
      status === 'completed' ? new Date() : null,
    ],
  );

  const rows = await execute(
    `
      SELECT
        id_submission,
        id_challenge,
        id_user,
        week_key,
        answer_text,
        status,
        completed_at,
        created_at,
        updated_at
      FROM ligue_challenge_submissions
      WHERE id_challenge = ? AND id_user = ? AND week_key = ?
      LIMIT 1
    `,
    [idChallenge, userId, weekKey],
  );

  return rows[0] ?? null;
}
