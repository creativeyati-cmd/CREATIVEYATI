# Dashboard consistency audit - 7 October 2026

Reference: production AdminWorkspace, not the sample dashboard. Inventory: 33 protected admin routes and 8 learning routes (including the course redirect). Existing primitives: AdminShell/StudentShell, useDashboardShell, SubmitButton, Badge/toneForStatus, Tabs, Drawer, RevokeCertificateDialog, Feedback and ToastHost.

## Findings before implementation
- The overview uses a 1500px container, 38px desktop padding, DocumentSans body, Fredoka headings, deep green actions and 20?23px cards. Other pages use viewport-based padding, lime actions, 14px cards and inconsistent title sizes.
- Repeated admin-title markup places actions inside the title flow; certificates and lessons bypass it altogether.
- Sidebar links inherit a transparent left border and multiple overlapping display/padding rules. Active and collapsed rules do not share a component. Both roles need one SidebarItem with identical geometry in all selected states.
- Activity, invoices, payments, certificates and enrolments use div grids masquerading as tables; some six-column content inherits five-column CSS. Projects/courses/students use unstructured lists. Table overflow can scroll the whole main area.
- Native form controls are already wrapped by labels; preserve their names, validation, actions and controlled state. Centralize their presentation, not their data handling.
- Tabs, badge tone mapping, drawers, empty states, skeletons and toasts are reusable. Extend them instead of duplicating them.
- Settings already have separate routes. Keep this grouping and give it consistent navigation/reading widths. Social profiles manage public links; there is no separate publishing or clients route to invent.
- Student certificate documents must retain printable document styling; lesson video/curriculum layouts must retain their playback behavior.

## Implementation contract
Shared page shell in both role layouts; common PageHeader and SidebarItem; semantic DataTable with localized horizontal scrolling; shared controls and action styles; existing Badge, Tabs, EmptyState, SkeletonTable, Drawer and ToastHost retained. No changes to permissions, payment settlement, authentication, schemas or server actions.

## Verification
- All protected admin page sources reviewed and migrated to PageHeader; the two role overviews also use it. The learner course entry is a redirect and keeps its existing no-lessons fallback. Course preview retains the public course heading within its preview body.
- SidebarItem is shared by admin/student sidebars; expanded and collapsed selected geometry is identical. Existing mobile focus containment, Escape and stored collapse preferences remain in use.
- DataTable replaces legacy div tables and the projects, courses, students, categories, coupons and orders lists. Search/filter/sort/pagination operate only on the records already loaded; server pagination/search on students and server order filters are retained. No misleading global totals are introduced.
- FormControls preserves native fields, names, validation and controlled state. SubmitButton retains pending/toast behavior. Existing confirmation components use the same native dialog treatment and preserve their server actions.
- SettingsNavigation links existing configuration routes. Website Content groups existing editing destinations; no new backend modules or social publishing feature is implied.
- Existing tables, profile, certificate, course editor, content editor, settings and student learning page sources were audited. Shared UI fixtures and both live-data dashboard components passed at 1440, 1024, 768 and 390px. This is not an end-to-end signed-in test of every production route.
- Browser checks cover overflow, selected icon/label positions, mobile sidebar, table search/filters/sort/pagination, empty state, drawer Escape, confirmation cancel/focus, and primary/secondary/destructive button colors.
- Build and ESLint validation run; lint has only the pre-existing image optimization warnings. Production signed-in CRUD, refund, upload and learning completion checks remain account-session dependent. Database functions and server actions are unchanged.

## Reuse
Import DashboardPageShell only in role layouts. New pages use PageHeader with title, description, eyebrow and actions; table pages use DataTable with a header row and rendered data rows. Keep server data fetching in the page and pass rendered cells. Reuse Badge/toneForStatus, Tabs, Drawer, EmptyState and SubmitButton. Use Input/Select/Textarea/Button for native controls; variant supports primary, secondary, ghost and danger. MetricCard is shared by both overviews. Print documents intentionally retain document-specific styling.

## Repeat browser checks
With the development server running: `python scripts/check-dashboard-ui.py`. Requires Python Playwright and Chrome; set CHROME_PATH if needed, and DASHBOARD_TEST_URL to change the local origin. Fixtures use `/design-review?view=ui-admin` or `ui-student` and are gated to development. Screenshots are saved to ignored `.review/`.
