import { dailySeries } from "../lib/dashboard-metrics.js";

export function dashboardFixtures(empty = false) {
  const now = new Date().toISOString();
  const progress = empty ? [] : [{ lesson_id: "lesson-1", completed: true, completed_at: now, updated_at: now }];
  const lessons = [1, 2, 3].map(id => ({ id: `lesson-${id}`, title: `Build your visual story ${id}`, lessonType: "video", durationSeconds: 600, resources: [] }));
  return {
    admin: { courses: empty ? 0 : 1, students: empty ? 0 : 142, certificates: 0, revenue: { NGN: dailySeries(empty ? [] : [{ paid_at: now, value: 240000 }], "paid_at", 180, new Date(), row => row.value), USD: dailySeries([], "paid_at", 180) }, monthlyRevenue: empty ? 0 : 240000, otherCurrencies: [], growth: dailySeries([], "created_at", 60), newStudents: 0, spotlight: empty ? null : { id: "course-1", title: "AI filmmaking: building your visual story", average: 33, enrolled: 12, lessons: 3 }, health: { average: 0, completion: 0, count: 0 }, enquiries: 0, pending: 0, drafts: 0, projects: 0, activity: [], draftCourses: 0, month: "Design fixture" },
    student: { user: { id: "fixture", user_metadata: { weekly_learning_goal: 3 } }, progress, enrolments: empty ? [] : [{ id: "enrolment-1", progress, course: { slug: "fixture", title: "AI filmmaking: building your visual story", sections: [{ lessons }] } }] },
  };
}
