"use client";

import Image from "next/image";
import Link from "next/link";
import CourseCurriculum from "@/Components/CourseCurriculum";
import CourseVideoPlayer from "@/Components/CourseVideoPlayer";
import { AdminIcon } from "@/Components/Icons";
import { courseStats, formatDuration } from "@/lib/course-format";

function initials(name) {
  return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "—";
}

function CourseCta({ label, href, inert = false, className = "" }) {
  if (inert) return <span className={`button ${className}`}>{label}</span>;
  return <Link className={`button ${className}`} href={href}>{label}</Link>;
}

export default function CourseOverview({ course, price = 0, priceLabel = "", instructorName = "", access = null, preview = false }) {
  const enrolled = Boolean(access?.enrolled);
  const lessons = course.sections.flatMap((section) => section.lessons || []);
  const progressIds = (access?.progress || []).filter((row) => row.completed && lessons.some((lesson) => lesson.id === row.lesson_id)).map((row) => row.lesson_id);
  const stats = courseStats(course.sections);
  const paragraphs = String(course.description || "").split(/\n\n+/).filter(Boolean);
  const instructor = course.instructor || instructorName || "";
  const completed = progressIds.length;
  const percentage = lessons.length ? Math.round(completed / lessons.length * 100) : 0;
  const cta = enrolled
    ? { label: completed ? "Continue learning" : "Start course", href: `/learn/${course.slug}` }
    : { label: price === 0 ? "Start learning" : "Buy course", href: `/checkout/${course.id}` };
  const facts = [
    { icon: "book", label: "Level", value: course.difficulty },
    { icon: "clock", label: "Duration", value: course.estimatedDuration },
    { icon: "play", label: "Lessons", value: stats.lessonCount ? `${stats.lessonCount} ${stats.lessonCount === 1 ? "lesson" : "lessons"}` : "" },
    { icon: "globe", label: "Language", value: course.language },
  ].filter((fact) => fact.value);

  return <article className="course-overview">
    <p className="overview-crumb"><Link className="inline-link" href="/courses">All courses</Link></p>

    {course.coverImageUrl && <div className="course-banner">
      <Image src={course.coverImageUrl} alt={`${course.title} cover`} fill sizes="(max-width: 900px) 92vw, 1120px" style={{ objectPosition: `${course.coverFocalX}% ${course.coverFocalY}%` }} unoptimized priority />
    </div>}

    <header className="course-head">
      <p className="eyebrow">{course.category || "COURSE"}</p>
      <h1 className="overview-title">{course.title}</h1>
      {course.shortDescription && <p className="overview-lede">{course.shortDescription}</p>}
      {instructor && <div className="course-instructor">
        <span className="instructor-mark" aria-hidden="true">{initials(instructor)}</span>
        <span><small>Instructor</small><strong>{instructor}</strong></span>
      </div>}
      {facts.length > 0 && <ul className="course-facts">
        {facts.map((fact) => <li key={fact.label}><AdminIcon name={fact.icon} size={15} /><span><small>{fact.label}</small>{fact.value}</span></li>)}
      </ul>}
      <div className="course-cta-row">
        {!enrolled && priceLabel && <strong className="course-price">{priceLabel}</strong>}
        <CourseCta label={cta.label} href={cta.href} inert={preview} />
        {enrolled && <div className="course-progress">
          <span className="progress-track"><i style={{ width: `${percentage}%` }} /></span>
          <small>{completed} of {lessons.length} lessons complete · {percentage}%</small>
        </div>}
      </div>
    </header>

    {course.promotionalEmbedUrl && <section className="course-promo-video">
      <h2>Course preview</h2>
      <CourseVideoPlayer lesson={{ id: "promo", title: `${course.title} promotional video`, sourceType: course.promotionalVideoSource, embedUrl: course.promotionalEmbedUrl, orientation: course.promotionalOrientation, aspectRatio: course.promotionalAspectRatio }} />
    </section>}

    <div className="course-body">
      {course.learningOutcomes?.length > 0 && <section className="course-section">
        <h2>What you&apos;ll learn</h2>
        <ul className="outcome-list">{course.learningOutcomes.map((item) => <li key={item}><AdminIcon name="check" size={15} /><span>{item}</span></li>)}</ul>
      </section>}

      <section className="course-section">
        <h2>About this course</h2>
        <div className="course-copy">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </section>

      {(course.requirements?.length > 0 || course.targetAudience?.length > 0) && <div className="course-columns">
        {course.requirements?.length > 0 && <section className="course-section is-card">
          <h2>Requirements</h2>
          <ul className="plain-list">{course.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>}
        {course.targetAudience?.length > 0 && <section className="course-section is-card">
          <h2>Who this is for</h2>
          <ul className="plain-list">{course.targetAudience.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>}
      </div>}

      <section className="course-section">
        <div className="section-heading">
          <div>
            <h2>Course curriculum</h2>
            <p>{stats.moduleCount} {stats.moduleCount === 1 ? "module" : "modules"} · {stats.lessonCount} {stats.lessonCount === 1 ? "lesson" : "lessons"}{stats.durationSeconds ? ` · ${formatDuration(stats.durationSeconds)} total` : ""}</p>
          </div>
        </div>
        {lessons.length ? <CourseCurriculum sections={course.sections} courseSlug={course.slug} enrolled={enrolled} progressIds={progressIds} inert={preview} defaultOpenId={course.sections.find((section) => section.lessons?.length)?.id} />
          : <p className="empty-state">Curriculum details will be published soon.</p>}
      </section>

      {course.materials?.length > 0 && <section className="course-section">
        <h2>Course resources</h2>
        <ul className="resource-list">{course.materials.map((resource) => <li key={resource.id}>
          <span className="resource-kind"><AdminIcon name="doc" size={15} /></span>
          <span><strong>{resource.title}</strong>{resource.description && <small>{resource.description}</small>}</span>
          <a className="inline-link" href={preview ? `/api/admin/course-draft-resource?courseId=${course.id}&key=${encodeURIComponent(resource.storageKey)}` : `/api/learn/resources/${resource.id}`} target="_blank" rel="noreferrer">Open</a>
        </li>)}</ul>
      </section>}
    </div>

    <section className="course-enroll">
      {enrolled ? <div className="course-enroll-inner">
        <div>
          <h2>Keep going</h2>
          <p>{completed} of {lessons.length} lessons complete · {percentage}%</p>
          <span className="progress-track"><i style={{ width: `${percentage}%` }} /></span>
        </div>
        <CourseCta label={cta.label} href={cta.href} inert={preview} />
      </div> : <div className="course-enroll-inner">
        <div>
          <h2>{price === 0 ? "Start this course today" : "Ready to start?"}</h2>
          <p>{priceLabel}{!preview && ` · ${stats.lessonCount} ${stats.lessonCount === 1 ? "lesson" : "lessons"}${stats.durationSeconds ? ` · ${formatDuration(stats.durationSeconds)}` : ""}`}</p>
        </div>
        <CourseCta label={cta.label} href={cta.href} inert={preview} />
      </div>}
    </section>
  </article>;
}
