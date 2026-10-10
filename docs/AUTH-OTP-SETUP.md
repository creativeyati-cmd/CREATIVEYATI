# Sign-up OTP and administrator access
Application release: sign-up leads to a prefilled email/code form. Password sign-in remains in use. OTP is verified on the server with type email; resending preserves the checkout destination. Codes remain one-use and expire according to Supabase configuration.

## Required live configuration
1. Supabase Authentication > Email Templates > Confirm signup: paste supabase/email-templates/confirm-signup.html. It displays {{ .Token }} instead of a consumable link.
2. Keep Confirm email enabled. Under Email provider settings set Email OTP expiration to 3600 seconds (one hour); keep resend throttling enabled.
3. Run supabase/production-admin-password-access.sql to make database admin policies match password-only app access.
4. For administrators with an existing authenticator, remove their enrolled factor in Supabase Authentication > Users using the supported factor removal controls. Existing factors otherwise still require AAL2 for password changes at Supabase.
No live Auth configuration or database change is implied by a Vercel deployment. Previously issued links/codes cannot be restored. Request a new code after updating the template.

## Coupon fixes
Coupon creation now explicitly interprets admin-entered dates in Africa/Lagos (UTC+1). Existing coupon dates are not shifted automatically. Review existing start/expiry timestamps in Supabase if entered before this release. Coupon validation distinguishes disabled/missing, future, expired, exhausted and database failures. Case-insensitive lookup escapes wildcard characters. Coupon payment rules remain server-enforced.

## Password reset email
Paste supabase/email-templates/reset-password.html into Supabase Authentication > Email Templates > Reset Password. Reset requests now lead to /reset-password/code; verification uses type recovery and grants password-update access only after Supabase verifies the code. Both template buttons open token-free pages, so email-link scanning cannot consume their codes. Existing reset links remain supported. Templates must be saved in Supabase; deployment alone does not update outgoing emails.
