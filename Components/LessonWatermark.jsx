// Casual-sharing deterrent: the viewer's own identity sits over the video, so a
// screen recording, screenshot or re-upload carries their name and email.
// Deliberately low contrast and non-interactive — it should be readable on a
// copy without spoiling the lesson. Extraction by a technical user is accepted.
export default function LessonWatermark({ label }) {
  if (!label) return null;
  return <div className="lesson-watermark" aria-hidden="true">
    <span>{label}</span>
    <span>{label}</span>
    <span>{label}</span>
  </div>;
}
