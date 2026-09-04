# Supabase setup

1. Create a Supabase project, then copy its Project URL and **Publishable key** from **Settings → API**.
2. Copy [`.env.example`](./.env.example) to `.env.local` and fill in the values. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Open the SQL Editor and run every migration in filename order:

   - [`202608270001_initial.sql`](./supabase/migrations/202608270001_initial.sql)
   - [`202608280001_protect_email_settings.sql`](./supabase/migrations/202608280001_protect_email_settings.sql)
   - [`202608280002_project_covers.sql`](./supabase/migrations/202608280002_project_covers.sql)
   - [`202608280003_cover_aspect_ratio.sql`](./supabase/migrations/202608280003_cover_aspect_ratio.sql)
   - [`202609040001_courses_social_ordering.sql`](./supabase/migrations/202609040001_courses_social_ordering.sql)
4. In **Authentication → URL Configuration**, add:

   - `http://localhost:3000`
   - your Vercel production URL
   - any preview URL used for admin testing

5. Create the first user in **Authentication → Users**. Then run this SQL, replacing the UUID:

```sql
insert into public.admin_users (id, role)
values ('AUTH_USER_UUID', 'admin');
```

Only users listed in `admin_users` can pass the server-side dashboard guard.

## Tables

The migrations create the portfolio, social, course, order, payment, enrolment, student progress, coupon, audit, and private-resource tables. They enable RLS, add atomic ordering functions, and create the public `profile-images` and private `course-resources` storage buckets.

## Course payments

Set `BACHS_API_KEY` and `BACHS_WEBHOOK_SECRET` in local and Vercel server environments. Start with a `sk_sandbox_...` API key; the integration selects Bachs' sandbox automatically, and switches to production when you provide a `sk_live_...` key. In the Bachs Developer Portal, configure the webhook URL as:

```text
https://aivideocreator.cv/api/payments/webhook
```

Subscribe that endpoint to `collection.succeeded`, `collection.failed`, `collection.underpaid`, `checkout.expired`, `refund.created`, `refund.paid`, and `refund.failed`. The return redirect is verified server-side, and the independently signed webhook completes the same idempotent enrolment operation. Do not add either Bachs secret to a `NEXT_PUBLIC_` variable. The API key needs `payments:write`, `payments:read`, and `refunds:write` scopes.

For student email verification and password resets, add `https://aivideocreator.cv/auth/callback` and the corresponding `www` URL to Supabase Authentication redirect URLs.

Paid PDFs are stored privately and served only through short-lived signed links after the server verifies an active enrolment. For paid video, configure Vimeo domain privacy, Mux, Bunny Stream, or Cloudflare Stream. Unlisted YouTube is supported as a temporary source but is not strong content protection.

## Local verification

```bash
npm install
npm run dev
```

Visit `/admin/login`, sign in with the user above, create a category and a YouTube project, then publish it. The public home page queries only published records.
