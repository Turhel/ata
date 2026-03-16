import type { Pool } from "pg";
import { HttpError } from "./auth.js";

export function isUuid(value: string) {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function resolveUserId(db: Pool, input: string): Promise<string> {
  const v = String(input ?? "").trim();
  if (!v) throw new HttpError(400, "user id is required");

  if (isUuid(v)) return v;

  // Clerk user id (ex: user_...)
  if (v.startsWith("user_")) {
    const r = await db.query(`select id from public.users where clerk_user_id = $1`, [v]);
    const id = r.rows?.[0]?.id ?? null;
    if (!id) throw new HttpError(404, "User not found");
    return id;
  }

  throw new HttpError(400, "Invalid user id");
}

export async function resolveOptionalUserId(db: Pool, input: any): Promise<string | null> {
  if (input == null) return null;
  const v = String(input).trim();
  if (!v) return null;
  return resolveUserId(db, v);
}
