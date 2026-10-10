# Course redesign integration ? 2026-10-10

Source: 19c5989 (course preview and student learning redesign), integrated onto bb5ce4b (private R2 uploads).

Preserved current course workspaces, JSON autosave, upload retry, R2 playback/download authorization, rich-text content, and pending completion buttons. Reused the new course overview and curriculum in public pages and the private working-draft preview, including device width controls. Added the redesigned student lesson layout and resume behavior. Archived lesson progress is excluded from displayed completion counts.

The source commit's legacy CourseForm, edit route and publishing helper were not imported: the persistent workspace already supersedes them. No schema migration is required.

Validation: production build, targeted ESLint, R2 access/upload checks, browser upload/retry/autosave/resource checks, responsive widths 1440/768/390, preview device controls and exit. Browser storage responses were mocked; authenticated production student flows were not exercised.
