import { getCourseVideoSource } from "./course-video-source.js";
export const AUTOSAVE_DELAY = Math.max(
  500,
  Math.min(10000, Number(process.env.NEXT_PUBLIC_COURSE_AUTOSAVE_MS) || 1200),
);
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value) => String(value ?? "");
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const list = (value) =>
  Array.isArray(value)
    ? value.map(text)
    : text(value).split(/\r?\n/).filter(Boolean);
export function emptyCourse(id) {
  return {
    id,
    title: "",
    slug: "",
    description: "",
    isFree: true,
    currency: "NGN",
    priceMinor: 0,
    sections: [],
    materials: [],
    language: "English",
    difficulty: "All levels",
  };
}
export function formCourse(values, step) {
  if (step === "pricing")
    return {
      isFree: values.isFree === "on",
      priceMinor: Math.round(number(values.price) * 100),
      discountedPriceMinor:
        values.discountedPrice === "" || values.discountedPrice == null
          ? null
          : Math.round(number(values.discountedPrice) * 100),
      currency: values.currency || "NGN",
      saleStartsAt: values.saleStartsAt || "",
      saleEndsAt: values.saleEndsAt || "",
      featured: values.featured === "on",
    };
  const result = { ...values };
  for (const key of ["learningOutcomes", "requirements", "targetAudience"])
    result[key] = list(values[key]);
  for (const key of ["coverFocalX", "coverFocalY", "coverWidth", "coverHeight"])
    result[key] = number(values[key]);
  delete result.id;
  delete result.step;
  delete result.courseCoverCleanupKeys;
  return result;
}
export function formLesson(values) {
  const result = {
    ...values,
    status: values.lessonStatus || "draft",
    isPreview: values.isPreview === "on",
    allowDownload: values.allowDownload === "on",
  };
  for (const key of ["durationSeconds", "aspectRatio"])
    result[key] = number(values[key]);
  result.width = number(values.videoWidth);
  result.height = number(values.videoHeight);
  const source = getCourseVideoSource(values.sourceUrl, values.sourceType);
  if (source) Object.assign(result, source, { processingStatus: "ready" });
  for (const key of [
    "newLesson",
    "courseId",
    "sectionId",
    "targetSectionId",
    "lessonStatus",
    "obsoleteStorageKey",
    "obsoletePosterStorageKey",
  ])
    delete result[key];
  return result;
}
export function validateDocument(document, id) {
  if (
    !document ||
    typeof document !== "object" ||
    document.id !== id ||
    !UUID.test(id) ||
    new TextEncoder().encode(JSON.stringify(document)).length > 1400000
  )
    throw new Error("The draft is invalid or too large.");
  if (
    !Array.isArray(document.sections) ||
    document.sections.length > 100 ||
    !Array.isArray(document.materials || [])
  )
    throw new Error("Use no more than 100 modules.");
  const ids = new Set([id]);
  let lessonCount = 0;
  for (const section of document.sections) {
    if (
      !UUID.test(section.id) ||
      ids.has(section.id) ||
      !Array.isArray(section.lessons)
    )
      throw new Error("Module references must be unique.");
    ids.add(section.id);
    for (const lesson of section.lessons) {
      if (
        !UUID.test(lesson.id) ||
        ids.has(lesson.id) ||
        !["video", "mixed", "text", "pdf", "external"].includes(
          lesson.lessonType,
        )
      )
        throw new Error("Invalid lesson reference or type.");
      ids.add(lesson.id);
      lessonCount++;
      for (const resource of lesson.resources || []) {
        if (!UUID.test(resource.id) || ids.has(resource.id))
          throw new Error("Invalid resource reference.");
        ids.add(resource.id);
      }
    }
  }
  if (lessonCount > 1000)
    throw new Error("Use no more than 1,000 lessons per course.");
  for (const resource of document.materials || []) {
    if (!UUID.test(resource.id) || ids.has(resource.id))
      throw new Error("Invalid material reference.");
    ids.add(resource.id);
  }
  return document;
}
export function publishingIssues(course) {
  const issues = [];
  const add = (step, message, field) => issues.push({ step, message, field });
  if (!text(course.title).trim())
    add("details", "Add a course title.", "title");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course.slug || ""))
    add(
      "details",
      "Choose a URL slug using lowercase letters, numbers and hyphens.",
      "slug",
    );
  if (!text(course.description).trim())
    add("details", "Add a full description.", "description");
  if (
    !/^https:\/\//.test(course.coverImageUrl || "") ||
    number(course.coverWidth) < 1280 ||
    number(course.coverHeight) < 720 ||
    Math.abs(number(course.coverWidth) / number(course.coverHeight) - 16 / 9) >
      0.02
  )
    add(
      "details",
      "Upload a 16:9 cover, at least 1280 x 720.",
      "coverImageUrl",
    );
  if (
    course.promotionalVideoUrl &&
    !getCourseVideoSource(course.promotionalVideoUrl)
  )
    add(
      "details",
      "Correct the promotional video link.",
      "promotionalVideoUrl",
    );
  if (
    !course.isFree &&
    (!Number.isSafeInteger(course.priceMinor) ||
      course.priceMinor <= 0 ||
      !/^[A-Z]{3}$/.test(course.currency))
  )
    add(
      "pricing",
      "Set a positive price and a valid three-letter currency.",
      "price",
    );
  if (
    course.discountedPriceMinor != null &&
    (course.discountedPriceMinor < 0 ||
      course.discountedPriceMinor > course.priceMinor)
  )
    add(
      "pricing",
      "Sale price must be between zero and the regular price.",
      "discountedPrice",
    );
  if (
    course.saleStartsAt &&
    course.saleEndsAt &&
    new Date(course.saleEndsAt) <= new Date(course.saleStartsAt)
  )
    add("pricing", "Sale must end after it starts.", "saleEndsAt");
  if (!course.sections.length) add("curriculum", "Add at least one module.");
  let ready = 0;
  for (const section of course.sections) {
    if (!text(section.title).trim())
      add("curriculum", "Give every module a title.", section.id);
    const slugs = new Set();
    for (const lesson of section.lessons) {
      if (lesson.status !== "published") continue;
      ready++;
      const prefix = lesson.title || "Untitled lesson";
      if (
        !text(lesson.title).trim() ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug || "") ||
        slugs.has(lesson.slug)
      )
        add(
          "curriculum",
          `${prefix}: add a title and unique URL slug.`,
          lesson.id,
        );
      slugs.add(lesson.slug);
      if (
        ["video", "mixed"].includes(lesson.lessonType) &&
        (lesson.sourceType === "upload"
          ? !lesson.storageKey || lesson.processingStatus !== "ready"
          : !getCourseVideoSource(lesson.sourceUrl, lesson.sourceType))
      )
        add(
          "curriculum",
          `${prefix}: finish uploading or choose a valid video.`,
          lesson.id,
        );
      if (lesson.lessonType === "text" && !text(lesson.body).trim())
        add("curriculum", `${prefix}: add written content.`, lesson.id);
      for (const key of ["externalUrl", "posterUrl", "captionsUrl"])
        if (lesson[key] && !/^https:\/\//.test(lesson[key]))
          add("curriculum", `${prefix}: ${key} must use HTTPS.`, lesson.id);
      if (
        lesson.lessonType === "external" &&
        !/^https:\/\//.test(lesson.externalUrl || "")
      )
        add("curriculum", `${prefix}: add an HTTPS resource link.`, lesson.id);
      if (lesson.lessonType === "pdf" && !lesson.resources?.length)
        add("curriculum", `${prefix}: upload a PDF.`, lesson.id);
    }
  }
  if (!ready)
    add("curriculum", "Mark at least one complete lesson as ready to publish.");
  return issues;
}
const courseStrings = {
  title: "title",
  slug: "slug",
  shortDescription: "short_description",
  description: "description",
  coverImageUrl: "cover_image_url",
  instructor: "instructor",
  category: "category",
  difficulty: "difficulty",
  language: "language",
  estimatedDuration: "estimated_duration",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
  ogImageUrl: "og_image_url",
  currency: "currency",
};
function strings(source, mapping) {
  return Object.fromEntries(
    Object.entries(mapping).map(([key, column]) => [column, text(source[key])]),
  );
}
const date = (value) =>
  value
    ? new Date(
        /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+01:00`,
      ).toISOString()
    : null;
export function normalizeWorkspace(doc) {
  const promo = getCourseVideoSource(doc.promotionalVideoUrl);
  const course = {
    ...strings(doc, courseStrings),
    difficulty: doc.difficulty || "All levels",
    language: doc.language || "English",
    currency: doc.currency || "NGN",
    cover_focal_x: Math.min(100, Math.max(0, number(doc.coverFocalX))),
    cover_focal_y: Math.min(100, Math.max(0, number(doc.coverFocalY))),
    cover_width: number(doc.coverWidth) || null,
    cover_height: number(doc.coverHeight) || null,
    is_free: Boolean(doc.isFree),
    price_minor: doc.isFree ? 0 : number(doc.priceMinor),
    discounted_price_minor: doc.isFree
      ? null
      : (doc.discountedPriceMinor ?? null),
    featured: Boolean(doc.featured),
    payment_gateway: "bachs",
    sale_starts_at: date(doc.saleStartsAt),
    sale_ends_at: date(doc.saleEndsAt),
    learning_outcomes: list(doc.learningOutcomes),
    requirements: list(doc.requirements),
    target_audience: list(doc.targetAudience),
    promotional_video_source: promo?.sourceType || null,
    promotional_video_url: promo?.sourceUrl || null,
    promotional_video_id: promo?.sourceId || null,
    promotional_embed_url: promo?.embedUrl || null,
    promotional_orientation:
      doc.promotionalOrientation === "portrait" ? "portrait" : "landscape",
    promotional_aspect_ratio:
      doc.promotionalOrientation === "portrait" ? 9 / 16 : 16 / 9,
  };
  const resources = [];
  const resource = (r, lessonId, index) => ({
    id: r.id,
    lesson_id: lessonId,
    title: text(r.title),
    description: text(r.description),
    storage_key: text(r.storageKey),
    mime_type: "application/pdf",
    file_size: number(r.fileSize),
    allow_download: r.allowDownload !== false,
    preview_allowed: Boolean(r.previewAllowed),
    display_order: index,
  });
  const sections = doc.sections.map((s, index) => ({
    id: s.id,
    title: text(s.title),
    description: text(s.description),
    display_order: index,
    lessons: s.lessons.map((l, i) => {
      const source = getCourseVideoSource(l.sourceUrl, l.sourceType);
      const video = ["video", "mixed"].includes(l.lessonType);
      const upload = video && l.sourceType === "upload";
      (l.resources || []).forEach((r, j) =>
        resources.push(resource(r, l.id, j)),
      );
      return {
        id: l.id,
        title: text(l.title),
        slug: l.slug || `lesson-${l.id}`,
        description: text(l.description),
        body: text(l.body),
        lesson_type: l.lessonType,
        display_order: i,
        status: l.status === "published" ? "published" : "draft",
        is_preview: l.status === "published" && Boolean(l.isPreview),
        duration_seconds: Math.max(0, Math.round(number(l.durationSeconds))),
        source_type: upload
          ? "upload"
          : video
            ? source?.sourceType || null
            : null,
        source_url: video ? source?.sourceUrl || null : null,
        source_id: video ? source?.sourceId || null : null,
        embed_url: video ? source?.embedUrl || null : null,
        video_provider: upload
          ? "upload"
          : video
            ? source?.sourceType || null
            : null,
        video_url: video ? source?.sourceUrl || null : null,
        video_asset_id: video ? source?.sourceId || null : null,
        storage_key: upload ? l.storageKey || null : null,
        external_url: l.externalUrl || null,
        orientation: l.orientation === "portrait" ? "portrait" : "landscape",
        aspect_ratio: number(l.aspectRatio) || 16 / 9,
        width: number(l.width) || null,
        height: number(l.height) || null,
        poster_url: l.posterUrl || null,
        poster_storage_key: l.posterStorageKey || null,
        captions_url: l.captionsUrl || null,
        transcript: text(l.transcript),
        privacy: ["public", "private", "unlisted"].includes(l.privacy)
          ? l.privacy
          : "unlisted",
        allow_download: Boolean(l.allowDownload),
        processing_status: video
          ? upload
            ? l.processingStatus || "pending"
            : source
              ? "ready"
              : "pending"
          : "ready",
        processing_error: null,
      };
    }),
  }));
  (doc.materials || []).forEach((r, i) => resources.push(resource(r, null, i)));
  return { course, sections, resources };
}
