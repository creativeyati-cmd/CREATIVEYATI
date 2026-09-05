# Supabase SQL Editor setup

For an existing CreativeYati project that already has the legacy
`projects`/`inquiries` schema, run `sql-editor-bootstrap.sql` once instead.
It preserves the legacy tables and adds the compatibility tables and columns
used by this application.

Run the migration files once in filename order:

1. `202608270001_initial.sql`
2. `202608280002_project_covers.sql`
3. `202608280003_cover_aspect_ratio.sql`
4. `202609040001_courses_social_ordering.sql`
5. `202609050001_external_video_sources.sql`

The `videos` table stores project details and external playback metadata. Video
files are not uploaded to Supabase. Project videos use YouTube links or Google
Drive files shared as **Anyone with the link**. The `project-covers` bucket is
only for portfolio cover images.

If `202609040001_courses_social_ordering.sql` previously stopped at
`relation "public.videos" does not exist`, apply the initial and project-cover
migrations first, then rerun the complete course migration.
