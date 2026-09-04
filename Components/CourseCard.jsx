import Link from "next/link";
import { coursePrice, formatMoney } from "@/lib/data/courses";

export default function CourseCard({ course }) {
  const price = coursePrice(course);
  return <article className="course-card"><Link href={`/courses/${course.slug}`}>
    <img src={course.coverImageUrl} alt="" />
    <div><span>{course.category || course.difficulty}</span><h2>{course.title}</h2><p>{course.shortDescription}</p><strong>{price === 0 ? "Free" : formatMoney(price, course.currency)}</strong></div>
  </Link></article>;
}
