import Link from "next/link";
import Image from "next/image";
import { coursePrice, formatMoney } from "@/lib/data/courses";

export default function CourseCard({ course }) {
  const price = coursePrice(course);
  // the listing query does not join lessons, so only course-level metadata can
  // be shown here — a lesson count would have to be guessed
  const meta = [course.estimatedDuration, course.difficulty].filter(Boolean);
  return <article className="course-card">
    <Link href={`/courses/${course.slug}`} aria-label={`View course: ${course.title}`}>
      {course.coverImageUrl ? <Image style={{objectPosition: `${course.coverFocalX ?? 50}% ${course.coverFocalY ?? 50}%`}} src={course.coverImageUrl} alt={`${course.title} cover`} width={640} height={360} sizes="(max-width: 767px) 90vw, (max-width: 1024px) 44vw, 30vw" unoptimized /> : <div className="course-cover-placeholder" aria-hidden="true">CREATE.<br/>YOUR NEXT CHAPTER.</div>}
      <div>
        <span>{course.category || course.difficulty}</span>
        <h2>{course.title}</h2>
        <p>{course.shortDescription}</p>
        {meta.length > 0 && <ul className="course-card-meta">{meta.map((item) => <li key={item}>{item}</li>)}</ul>}
        <div className="course-card-foot">
          <strong>{price === 0 ? "Free" : formatMoney(price, course.currency)}</strong>
          <span className="course-card-cta">View course<span aria-hidden="true"> →</span></span>
        </div>
      </div>
    </Link>
  </article>;
}
