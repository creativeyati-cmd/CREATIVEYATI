// Calendar buckets use the academy's Lagos timezone (UTC+1).
export function dayKey(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "";
  return new Date(new Date(value).getTime() + 3600000).toISOString().slice(0, 10);
}
export function dailySeries(rows, dateField, days, now = new Date(), value = () => 1) {
  const today = dayKey(now);
  const end = new Date(today + "T12:00:00Z");
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(end.getTime() - (days - 1 - index) * 86400000).toISOString().slice(0, 10);
    return { date, label: new Date(date + "T12:00:00Z").toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }), value: 0 };
  });
  const lookup = new Map(buckets.map(bucket => [bucket.date, bucket]));
  for (const row of rows) {
    const bucket = lookup.get(dayKey(row[dateField]));
    if (bucket) bucket.value += value(row);
  }
  return buckets;
}
export function learningStreak(progress, now = new Date()) {
  const days = new Set(progress.filter(row => row.completed).map(row => dayKey(row.completed_at)).filter(Boolean));
  let cursor = new Date(dayKey(now) + "T12:00:00Z");
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor = new Date(cursor.getTime() - 86400000);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}
export function platformProgress(enrolments, lessons, progress) {
  const byCourse = new Map();
  for (const lesson of lessons) {
    if (!byCourse.has(lesson.course_id)) byCourse.set(lesson.course_id, new Set());
    byCourse.get(lesson.course_id).add(lesson.id);
  }
  const done = new Map();
  for (const entry of progress.filter(row => row.completed)) {
    const key = `${entry.student_id}:${entry.course_id}`;
    if (!done.has(key)) done.set(key, new Set());
    if (byCourse.get(entry.course_id)?.has(entry.lesson_id)) done.get(key).add(entry.lesson_id);
  }
  const states = enrolments.filter(row => byCourse.get(row.course_id)?.size).map(row => {
    const total = byCourse.get(row.course_id).size;
    return { ...row, percent: (done.get(`${row.student_id}:${row.course_id}`)?.size || 0) / total * 100 };
  });
  return {
    average: states.length ? Math.round(states.reduce((sum, row) => sum + row.percent, 0) / states.length) : 0,
    completion: states.length ? Math.round(states.filter(row => row.percent === 100).length / states.length * 100) : 0,
    count: states.length,
  };
}
