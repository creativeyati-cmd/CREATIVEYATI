import Link from "next/link";
import Image from "next/image";
import { coursePrice, formatMoney } from "@/lib/data/courses";

export default function CourseCard({ course }) {
  const price = coursePrice(course);
  return <article className="course-card"><Link href={`/courses/${course.slug}`}>
    <Image src={course.coverImageUrl} alt={`${course.title} cover`} width={640} height={360} sizes="(max-width: 767px) 45vw, (max-width: 1024px) 44vw, 30vw" unoptimized />
    <div><span>{course.category || course.difficulty}</span><h2>{course.title}</h2><p>{course.shortDescription}</p><strong>{price === 0 ? "Free" : formatMoney(price, course.currency)}</strong></div>
  </Link></article>;
}
