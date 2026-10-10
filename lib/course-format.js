export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (!total) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes} min`;
  return `${total}s`;
}

export function moduleDuration(lessons = []) {
  return lessons.reduce((sum, lesson) => sum + (Number(lesson?.durationSeconds) || 0), 0);
}

export function courseStats(sections = []) {
  const stats = { moduleCount: 0, lessonCount: 0, durationSeconds: 0 };
  for (const section of sections) {
    if (!section?.lessons?.length) continue;
    stats.moduleCount += 1;
    stats.lessonCount += section.lessons.length;
    stats.durationSeconds += moduleDuration(section.lessons);
  }
  return stats;
}
