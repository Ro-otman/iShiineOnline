export function buildSchedule({ startBase, subjects, secondsPerQuestion, questionsPerSubject, marginSeconds, breakSeconds }) {
  const base = startBase instanceof Date ? startBase : new Date(startBase);
  if (Number.isNaN(base.getTime())) {
    const err = new Error('startBase invalide');
    err.statusCode = 500;
    err.code = 'LIGUE_BAD_CONFIG';
    throw err;
  }

  const slotDurationSeconds = secondsPerQuestion * questionsPerSubject + marginSeconds;

  let cursorMs = base.getTime();

  const slots = subjects.map((subject, index) => {
    const startAt = new Date(cursorMs);
    const endAt = new Date(cursorMs + slotDurationSeconds * 1000);

    cursorMs = endAt.getTime() + breakSeconds * 1000;

    return {
      index,
      ...subject,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      durationSeconds: slotDurationSeconds
    };
  });

  const now = Date.now();
  const current = slots.find((s) => now >= Date.parse(s.startAt) && now < Date.parse(s.endAt)) || null;

  return {
    startBase: base.toISOString(),
    slotDurationSeconds,
    breakSeconds,
    slots,
    current
  };
}
