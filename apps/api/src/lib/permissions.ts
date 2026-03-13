import type { ApiEnv } from "../env.js";
import { getSessionFromRequest } from "./auth.js";
import { getActiveRoleCodeByUserId } from "../modules/users/get-active-role-by-user-id.js";
import { getUserByAuthUserId } from "../modules/users/get-user-by-auth-user-id.js";

export type RoleCode = "master" | "admin" | "assistant" | "inspector";

export class PermissionError extends Error {
  statusCode: number;
  code:
    | "UNAUTHORIZED"
    | "OPERATIONAL_PROFILE_MISSING"
    | "USER_NOT_ACTIVE"
    | "ROLE_MISSING"
    | "FORBIDDEN_ROLE"
    | "INTERNAL_ERROR";
  details?: Record<string, unknown>;

  constructor(params: {
    statusCode: number;
    code: PermissionError["code"];
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "PermissionError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export async function requireAuthenticated(env: ApiEnv, request: { raw: { headers: any } }) {
  const session = await getSessionFromRequest(env, request);
  if (!session) {
    throw new PermissionError({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Sess\u00e3o inv\u00e1lida ou ausente"
    });
  }
  return session;
}

export async function requireOperationalUser(env: ApiEnv, authUserId: string) {
  if (!env.databaseUrl) {
    throw new PermissionError({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "DATABASE_URL n\u00e3o definido"
    });
  }

  const operationalUser = await getUserByAuthUserId(env.databaseUrl, authUserId);
  if (!operationalUser) {
    throw new PermissionError({
      statusCode: 403,
      code: "OPERATIONAL_PROFILE_MISSING",
      message: "Perfil operacional n\u00e3o encontrado para este usu\u00e1rio"
    });
  }

  return operationalUser;
}

export function requireActiveUser(operationalUser: { status: string }) {
  if (operationalUser.status !== "active") {
    throw new PermissionError({
      statusCode: 403,
      code: "USER_NOT_ACTIVE",
      message: `Usu\u00e1rio n\u00e3o est\u00e1 ativo (status=${operationalUser.status})`,
      details: { status: operationalUser.status }
    });
  }

  return operationalUser as typeof operationalUser & { status: "active" };
}

export async function requireRole(params: {
  env: ApiEnv;
  operationalUserId: string;
  allowed: RoleCode | readonly RoleCode[];
}) {
  if (!params.env.databaseUrl) {
    throw new PermissionError({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "DATABASE_URL n\u00e3o definido"
    });
  }

  const role = await getActiveRoleCodeByUserId(params.env.databaseUrl, params.operationalUserId);
  if (!role) {
    throw new PermissionError({
      statusCode: 403,
      code: "ROLE_MISSING",
      message: "Usu\u00e1rio sem role ativa"
    });
  }

  const allowed = Array.isArray(params.allowed) ? params.allowed : [params.allowed];
  if (!allowed.includes(role)) {
    throw new PermissionError({
      statusCode: 403,
      code: "FORBIDDEN_ROLE",
      message: `Role '${role}' n\u00e3o permitida`,
      details: { role, allowed }
    });
  }

  return role;
}

