// Small, safe formatting vocabulary: user text is always rendered as React text.
function inline(text) {
  return text
    .split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("_") ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );
}
export default function CourseWrittenContent({ text = "" }) {
  return (
    <div className="lesson-body">
      {text
        .split(/\n/)
        .map((line, i) =>
          line.startsWith("## ") ? (
            <h3 key={i}>{inline(line.slice(3))}</h3>
          ) : line.startsWith("- ") ? (
            <p key={i}>? {inline(line.slice(2))}</p>
          ) : line ? (
            <p key={i}>{inline(line)}</p>
          ) : (
            <br key={i} />
          ),
        )}
    </div>
  );
}
