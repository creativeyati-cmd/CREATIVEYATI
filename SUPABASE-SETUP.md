# Supabase setup

1. Create a Supabase project, then copy its Project URL and **Publishable key** from **Settings → API**.
2. Copy [`.env.example`](./.env.example) to `.env.local` and fill in the values. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Open the SQL Editor and run [`supabase/migrations/202608270001_initial.sql`](./supabase/migrations/202608270001_initial.sql).
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

The migration creates `admin_users`, `categories`, `videos`, `enquiries`, `site_content`, `site_settings`, and `activity_logs`. It also enables RLS and exposes only `published` videos and visible categories publicly.

## Local verification

```bash
npm install
npm run dev
```

Visit `/admin/login`, sign in with the user above, create a category and a YouTube project, then publish it. The public home page queries only published records.
