# Dashboard, documents and account access release

Status: local implementation, not deployed. Updated 2026-10-05.
Branch: `feat/dashboard-documents-and-access`; baseline: `26f2041`.

## Agreed behavior

Use AI VIDEO CREATOR on documents. A successful positive payment produces a
receipt for either a client or a student. Unpaid client documents retain their
invoice/quotation label. The document settings page controls business contact
details and the certificate signer; existing defaults use Idayat Ibrahim,
Course instructor. No invented bank or tax details are printed.

The cream portrait receipt and cream/bronze landscape certificate follow the
supplied visual references. PDFs embed fonts, wrap names and line items, paginate
long receipts and include certificate verification. Student receipt downloads
require the owning account. Revoked certificates are visibly marked.

Admin navigation is grouped into Workspace, Studio, Academy, Commerce, Website
and Settings. Students have mobile shortcuts. Course authoring already supports
multiple modules and lessons; this release clarifies module labels, confirms
module deletion and connects the Students workflow screen.

Students verify their email. Admins sign in through Supabase Auth and complete
authenticator-app MFA before protected pages, actions or APIs. The legacy
environment-password login no longer grants admin access. Shared offline media
caching is disabled until an entitlement-aware design is implemented.

## Local review

Run `node scripts/check-documents.mjs` for document, safe-redirect, receipt mapping
and curriculum progress checks. Sample output is in ignored `.review/`:
`receipt.pdf`, `certificate.pdf`, `receipt-multipage.pdf`,
`certificate-revoked.pdf`. All samples are synthetic, not issued records.

Run `node scripts/check-finance-sql.mjs` for isolated PostgreSQL checks of the
finance migration. This passes with 1,501 orders, over 500 invoices, multiple
currencies, excluded document states, empty tables, repeated migration execution
and anonymous/non-admin denial. It uses a local PGlite engine with fixture schema
and a test admin predicate; deployed Supabase Auth/RLS integration still needs QA.

The development-only `/design-review` route shows documents and both shells with
sample data. It returns not found in a production build. Public auth pages and
sample shells have been reviewed at 390px and 1440px for rendering and overflow.
This is not authenticated account or payment-provider testing.

Verification on 2026-10-05: production build passed; ESLint completed with zero
errors and two existing image warnings in the home and hero-preview pages;
document/redirect/progress checks passed. Anonymous student receipt and certificate
requests returned 401; admin MFA redirected to login; password update without a
recovery grant redirected to the reset request page. `git diff --check` passed.
Both sample shells passed browser checks for the mobile focus trap, Escape focus
restoration, persisted desktop collapse, no horizontal overflow and the 899/900px
navigation breakpoint. Full-page screenshots can resize the viewport and close
the drawer; keyboard checks were run independently of screenshot capture.

## Release gates

Dependencies were updated to Next.js/ESLint config 16.3.8, Sharp 0.35.5 and
Nodemailer 10.0.14, with compatible transitive audit fixes. References:
[Next.js release](https://github.com/vercel/next.js/releases/tag/v16.3.8),
[Sharp release](https://github.com/lovell/sharp/releases/tag/v0.35.5),
[Nodemailer changelog](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md).
`npm audit --omit=dev` reports zero known vulnerabilities as of 2026-10-05.
Full audit retains five high findings in the development-only chain
`eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces`.
The underlying advisory is [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The suggested forced fix downgrades the lint configuration to Next 14 and was not
applied. Keep this issue tracked; a clean production audit is not a security proof.

`node scripts/check-runtime-dependencies.mjs` passes image resize/WebP/AVIF and
local MIME generation checks. It sends no email. Real SMTP delivery still needs
staging verification after the Nodemailer major-version update.
The Next.js 16.3.8 production build and lint passed (zero lint errors, the same
two image warnings). A local `next start` smoke test returned 200 for login and
registration, 307 for unauthenticated admin access, 401 for receipt access and
404 for the development-only design review route.

1. Configure staging Supabase and payment test credentials outside source control.
   The current local Supabase URL is a placeholder. Failed readiness queries
   against it provide no evidence about production users, tables or content.
2. Verify earlier schema migrations, especially
   `202609070001_activity_actor.sql` and `202609070002_academy_content.sql`.
   Apply and exercise `202610040001_admin_mfa.sql` and
   `202610040002_invoice_receipt_settlement.sql` in staging first. Also apply
   `202610050001_admin_finance_summary.sql` for uncapped, currency-separated
   overview and invoice totals. This RPC uses caller permissions and requires
   `is_admin()`; invoice list display remains limited to the latest 300 documents
   and explicitly labels that limit. The settlement migration
   exposes settlement only to service_role, locks the invoice, validates the
   amount/currency and commits the receipt and paid status together.
3. Ensure a verified Supabase Auth user is mapped in `admin_users` and can enroll
   a TOTP factor. Keep a documented recovery path through the Supabase project
   owner. Deploying without that account preparation can lock administrators out.
4. Enable email confirmation and TOTP in Supabase, configure SMTP and the exact
   staging/production callback URLs. Optional typed email codes require the email
   template to include the token. Test delivery, resend limits and expired codes.
5. Test recovery links in the requesting browser: the PKCE exchange must succeed
   before the signed, user-bound 15-minute recovery grant permits a password
   change. Test reuse, expiry, unrelated sessions and malformed redirect targets.
6. Test student registration from checkout through verification and return;
   free enrollment; paid/cancelled/failed purchases; coupons; duplicate signed
   webhooks; manual client settlement; exactly one client receipt; student PDF
   ownership; and mixed currencies. SQL transaction behavior still needs runtime
   verification, including simultaneous settlement requests.
7. With two student accounts, test private media/resources, draft lessons,
   expired/revoked enrollments, progress, completion, certificate issue/revoke,
   verification and PDF download. Test multi-module publishing and real uploads.
8. Test admin MFA enrollment and challenge, invalid/expired codes, AAL1 rejection
   by both application and database policies, session refresh and global sign-out.
   Already issued access tokens can remain valid until expiry; verify the desired
   session lifetime in the project configuration.
9. Recheck mobile/desktop authenticated screens with real data and failures.
   Verify cache removal and account switching; offline playback is not supported
   by this release. Downloaded files cannot be remotely revoked.
10. Record release SHA, migration results, deployment checks and support ownership.
    Coordinate schema/auth rollout: the MFA migration changes existing RLS access,
    and settlement code requires the new RPC. Do not roll back code independently
    without checking these dependencies.

Provider references: [Supabase TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp),
[server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

The remaining product roadmap is tracked separately in
[PRODUCTION-TODO.md](PRODUCTION-TODO.md). This release does not claim that every
planned filter, detail drawer, search, theme or Academy content feature is done.
