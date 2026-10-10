import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(
        pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href,
        context,
      );
    if (specifier.startsWith(".") && !path.extname(specifier))
      return next(specifier + ".js", context);
    return next(specifier, context);
  },
});
const { emptyCourse, publishingIssues, normalizeWorkspace, validateDocument } =
  await import("../lib/course-workspace.js");
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role; create function public.is_admin() returns boolean language sql as $$select false$$;`,
);
const base = readFileSync(
  "supabase/migrations/202609040001_courses_social_ordering.sql",
  "utf8",
);
await db.exec(
  base.slice(
    base.indexOf("create table if not exists public.courses"),
    base.indexOf("create table if not exists public.student_profiles"),
  ),
);
const workflow = readFileSync(
  "supabase/migrations/202609050002_complete_course_workflow.sql",
  "utf8",
);
await db.exec(
  workflow.slice(0, workflow.indexOf("insert into storage.buckets")),
);
const sql = readFileSync(
  "supabase/migrations/202610090001_course_workspaces.sql",
  "utf8",
);
await db.exec(sql);
await db.exec(sql);
const id = "00000000-0000-4000-8000-000000000001",
  sid = "00000000-0000-4000-8000-000000000002",
  lid = "00000000-0000-4000-8000-000000000003";
const draft = emptyCourse(id);
validateDocument(draft, id);
assert.ok(publishingIssues(draft).length);
const save = (revision, doc) =>
  db.query("select save_course_workspace($1,$2,$3,null) revision", [
    id,
    revision,
    JSON.stringify(doc),
  ]);
assert.equal((await save(0, draft)).rows[0].revision, 1);
assert.equal((await save(0, draft)).rows[0].revision, 1); // retry after lost response
assert.equal(
  (await db.query("select count(*)::int n from courses")).rows[0].n,
  1,
);
await assert.rejects(
  () => save(0, { ...draft, title: "Stale browser" }),
  (e) => e.code === "40001",
);
Object.assign(draft, {
  title: "Course",
  slug: "course",
  description: "A complete course",
  coverImageUrl: "https://example.com/cover.jpg",
  coverWidth: 1280,
  coverHeight: 720,
  coverFocalX: 50,
  coverFocalY: 50,
  sections: [
    {
      id: sid,
      title: "Module",
      lessons: [
        {
          id: lid,
          title: "Lesson",
          slug: "lesson",
          lessonType: "text",
          body: "Hello",
          status: "published",
          resources: [],
        },
      ],
    },
  ],
});
assert.deepEqual(publishingIssues(draft), []);
await save(1, draft);
const publish = (revision) =>
  db.query("select publish_course_workspace($1,$2,$3) revision", [
    id,
    revision,
    JSON.stringify(normalizeWorkspace(draft)),
  ]);
assert.equal((await publish(2)).rows[0].revision, 3);
await db.exec(
  `create table test_progress(lesson_id uuid references course_lessons(id), completed boolean);insert into test_progress values('${lid}',true);`,
);
const before = (await db.query("select title from courses where id=$1", [id]))
  .rows[0].title;
draft.title = "Private change";
draft.sections[0].lessons[0].body = "Private body";
await save(3, draft);
assert.equal(
  (await db.query("select title from courses where id=$1", [id])).rows[0].title,
  before,
);
assert.equal(
  (await db.query("select body from course_lessons where id=$1", [lid])).rows[0]
    .body,
  "Hello",
);
await assert.rejects(
  () => publish(3),
  (e) => e.code === "40001",
);
await publish(4);
assert.equal(
  (await db.query("select completed from test_progress")).rows[0].completed,
  true,
);
// Removing a module archives instead of deleting progress.
draft.sections = [];
await save(5, draft);
await publish(6);
assert.equal(
  (await db.query("select status from course_lessons where id=$1", [lid]))
    .rows[0].status,
  "archived",
);
assert.equal(
  (await db.query("select count(*)::int n from test_progress")).rows[0].n,
  1,
);
const historical = (
  await db.query(
    "select document from course_workspace_history where revision=4",
  )
).rows[0].document;
await save(7, historical);
await db.query("select publish_course_workspace($1,8,$2)", [
  id,
  JSON.stringify(normalizeWorkspace(historical)),
]);
assert.equal(
  (await db.query("select status from course_lessons where id=$1", [lid]))
    .rows[0].status,
  "published",
);
await db.query("select course_workspace_lifecycle($1,9,'archive')", [id]);
await db.query("select course_workspace_lifecycle($1,10,'restore')", [id]);
for (const role of ["anon", "authenticated"])
  assert.equal(
    (
      await db.query(
        "select has_function_privilege($1,'public.save_course_workspace(uuid,integer,jsonb,uuid)','EXECUTE') allowed",
        [role],
      )
    ).rows[0].allowed,
    false,
  );
// A failed publish rolls back curriculum changes and cannot steal another course's lesson.
const other = "00000000-0000-4000-8000-000000000010",
  otherSection = "00000000-0000-4000-8000-000000000011",
  otherLesson = "00000000-0000-4000-8000-000000000012";
await db.query(
  "insert into courses(id,title,slug) values($1,'Other','other')",
  [other],
);
await db.query(
  "insert into course_sections(id,course_id,title) values($1,$2,'Other module')",
  [otherSection, other],
);
await db.query(
  "insert into course_lessons(id,course_id,section_id,title,slug,lesson_type,status) values($1,$2,$3,'Other lesson','other','text','draft')",
  [otherLesson, other, otherSection],
);
const malicious = structuredClone(historical);
malicious.sections[0].lessons[0].id = otherLesson;
const rev = (
  await db.query("select revision from course_workspaces where course_id=$1", [
    id,
  ])
).rows[0].revision;
await save(rev, malicious);
const titleBefore = (
  await db.query("select title from courses where id=$1", [id])
).rows[0].title;
await assert.rejects(
  () =>
    db.query("select publish_course_workspace($1,$2,$3)", [
      id,
      rev + 1,
      JSON.stringify(normalizeWorkspace(malicious)),
    ]),
  /ownership mismatch/,
);
assert.equal(
  (await db.query("select title from courses where id=$1", [id])).rows[0].title,
  titleBefore,
);
assert.equal(
  (
    await db.query("select course_id from course_lessons where id=$1", [
      otherLesson,
    ])
  ).rows[0].course_id,
  other,
);
// A legacy/direct curriculum edit invalidates the optimistic live-version baseline.
await db.query(
  "update course_lessons set body='Other administrator' where id=$1",
  [lid],
);
await assert.rejects(
  () => save(rev + 1, historical),
  (error) => error.code === "40001",
);
const rebased = structuredClone(historical);
rebased.sections[0].lessons[0].body = "Other administrator";
const rebasedResult = await db.query(
  "select rebase_course_workspace($1,$2,(select updated_at from courses where id=$1),$3) revision",
  [id, rev + 1, JSON.stringify(rebased)],
);
assert.equal(rebasedResult.rows[0].revision, rev + 2);
await save(rev + 2, rebased);
const actions = readFileSync("app/admin/course-workspace-actions.js", "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replaceAll("export ", "");
const unauthorized = new Function(
  "getAdminUser",
  "createSupabaseServiceClient",
  actions + ";return {saveWorkspace,publishWorkspace,courseLifecycle};",
)(
  async () => null,
  () => {
    throw new Error("Database must not be reached");
  },
);
for (const run of [
  () => unauthorized.saveWorkspace(id, 1, draft),
  () => unauthorized.publishWorkspace(id, 1),
  () => unauthorized.courseLifecycle(id, 1, "archive"),
]) {
  const result = await run();
  assert.equal(result.ok, false);
  assert.match(result.error, /administrator session expired/);
}
console.log(
  "PASS incomplete drafts, idempotency, conflicts, private published edits, atomic publish, preserved progress, archive/restore, version recovery and role restrictions",
);
await db.close();
