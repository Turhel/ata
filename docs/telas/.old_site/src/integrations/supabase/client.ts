/**
 * Supabase client DISABLED on the browser.
 *
 * We intentionally do NOT initialize supabase-js on the frontend.
 * All database access is handled via server-side API routes.
 *
 * Authentication is handled by Clerk.
 *
 * If you need Supabase access, use it ONLY on the backend
 * with the Postgres connection string.
 */

export const supabase = null as never;
