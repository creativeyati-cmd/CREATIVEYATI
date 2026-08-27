# Vercel deployment

1. Import `creativeyati-cmd/CREATIVEYATI` into Vercel. Vercel detects Next.js automatically.
2. In **Project Settings → Environment Variables**, add every variable from `.env.example` for **Production**, **Preview**, and **Development** as appropriate.
3. Mark `SUPABASE_SERVICE_ROLE_KEY` and `SMTP_ENCRYPTION_KEY` as sensitive. Never prefix either with `NEXT_PUBLIC_`.
4. Set `NEXT_PUBLIC_SITE_URL` to the final canonical production domain, then redeploy. Environment-variable edits affect new deployments only.
5. Add the Vercel production and preview URLs to Supabase Auth redirect URLs before enabling password recovery.
6. Deploy from `main` as Production. Use a branch for Preview testing first.

After the first deployment, test admin login, a published YouTube project, public filtering, and an enquiry submission. Do not add the service-role key to GitHub Actions logs, browser code, or client-side configuration.
