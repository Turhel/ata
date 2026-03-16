import { verifyToken } from "@clerk/backend";
import { getPool } from "./db.js";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getBearerToken(req: any): string | null {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function pickTokenEmail(decoded: any): string | null {
  const candidates = [
    decoded?.email,
    decoded?.email_address,
    decoded?.emailAddress,
    decoded?.primary_email_address,
    decoded?.primaryEmailAddress,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function pickTokenFullName(decoded: any): string | null {
  const candidates = [
    decoded?.name,
    decoded?.full_name,
    decoded?.fullName,
    decoded?.username,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export type Role = "user" | "admin" | "master";

export async function requireAuth(
  req: any,
  opts?: { roles?: Role[] }
): Promise<{
  clerkUserId: string;
  sessionId: string | null;
  user: {
    id: string;
    role: Role;
    full_name: string | null;
    email: string | null;
    active: boolean;
    clerk_user_id: string | null;
  };
}> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new HttpError(500, "Missing CLERK_SECRET_KEY");

  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, "Missing Authorization: Bearer <token>");

  let clerkUserId: string | null = null;
  let sessionId: string | null = null;
  let decoded: any = null;
  try {
    decoded = await verifyToken(token, { secretKey });
    clerkUserId = decoded?.sub ? String(decoded.sub) : null;
    sessionId = decoded?.sid ? String(decoded.sid) : null;
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  if (!clerkUserId) throw new HttpError(401, "Invalid token (missing sub)");
  const email = pickTokenEmail(decoded as any);
  const fullName = pickTokenFullName(decoded as any);

  const db = getPool();

  // Upsert usuário (garante que orders/assistants FK funcionem)
  const sql = `
    insert into public.users (clerk_user_id, email, full_name, created_at, updated_at)
    values ($1, $2, $3, now(), now())
    on conflict (clerk_user_id)
    do update set
      email = coalesce(excluded.email, public.users.email),
      full_name = coalesce(excluded.full_name, public.users.full_name),
      updated_at = now()
    returning id, role, full_name, email, active, clerk_user_id
  `;

  const r = await db.query(sql, [clerkUserId, email, fullName]);
  const user = r.rows?.[0];
  if (!user) throw new HttpError(500, "Failed to upsert user");

  if (!user.active) throw new HttpError(403, "User inactive");

  if (opts?.roles?.length) {
    if (!opts.roles.includes(user.role)) throw new HttpError(403, "Forbidden");
  }

  return { clerkUserId, sessionId, user };
}
