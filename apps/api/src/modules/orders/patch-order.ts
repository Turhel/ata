import { and, eq, inArray, sql } from "drizzle-orm";
import { orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

type PatchBody = Record<string, unknown>;

export type PatchOrderResult =
  | {
      ok: true;
      order: {
        id: string;
        status: string;
        updatedAt: Date | string;
        residentName: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        workTypeId: string | null;
        isRush: boolean;
        isVacant: boolean;
        clientId?: string | null;
        inspectorAccountId?: string | null;
        assignedInspectorId?: string | null;
      };
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATUS" | "BAD_REQUEST";
      message: string;
      details?: { forbiddenFields?: string[]; invalidFields?: string[] };
    };

const assistantAllowedFields = [
  "residentName",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zipCode",
  "workTypeId",
  "isRush",
  "isVacant"
] as const;

const adminAllowedFields = [
  ...assistantAllowedFields,
  "inspectorAccountId",
  "assignedInspectorId",
  "clientId"
] as const;

function isObject(value: unknown): value is PatchBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringOrNull(value: unknown) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return Symbol("invalid");
  return value;
}

function toBooleanOrUndefined(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return Symbol("invalid");
  return value;
}

function buildPatch(params: { body: unknown; allowed: readonly string[] }) {
  if (!isObject(params.body)) {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: "Body JSON inválido",
      details: undefined
    };
  }

  const body = params.body as PatchBody;

  const keys = Object.keys(body);
  const forbiddenFields = keys.filter((k) => !params.allowed.includes(k));
  if (forbiddenFields.length > 0) {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: `Payload contém campos não permitidos: ${forbiddenFields.join(", ")}`,
      details: { forbiddenFields }
    };
  }

  const invalidFields: string[] = [];
  const patch: Record<string, any> = {};

  function setStringField(field: string) {
    if (!(field in body)) return;
    const value = toStringOrNull(body[field]);
    if (typeof value === "symbol") {
      invalidFields.push(field);
      return;
    }
    patch[field] = value === undefined ? undefined : value;
  }

  function setIdField(field: string) {
    if (!(field in body)) return;
    const raw = body[field];
    if (raw === null) {
      patch[field] = null;
      return;
    }
    if (typeof raw !== "string") {
      invalidFields.push(field);
      return;
    }
    patch[field] = raw;
  }

  function setBoolField(field: string) {
    if (!(field in body)) return;
    const value = toBooleanOrUndefined(body[field]);
    if (typeof value === "symbol") {
      invalidFields.push(field);
      return;
    }
    patch[field] = value;
  }

  setStringField("residentName");
  setStringField("addressLine1");
  setStringField("addressLine2");
  setStringField("city");
  setStringField("state");
  setStringField("zipCode");

  setIdField("workTypeId");
  setBoolField("isRush");
  setBoolField("isVacant");

  if (params.allowed.includes("clientId")) setIdField("clientId");
  if (params.allowed.includes("inspectorAccountId")) setIdField("inspectorAccountId");
  if (params.allowed.includes("assignedInspectorId")) setIdField("assignedInspectorId");

  if (invalidFields.length > 0) {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: `Campos inválidos no payload: ${invalidFields.join(", ")}`,
      details: { invalidFields }
    };
  }

  const patchKeys = Object.keys(patch).filter((k) => patch[k] !== undefined);
  if (patchKeys.length === 0) {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: "Nenhum campo permitido informado no payload"
    };
  }

  return { ok: true as const, patch: patch as PatchBody };
}

export async function patchOrderAsAssistant(params: {
  databaseUrl: string;
  orderId: string;
  actorUserId: string;
  body: unknown;
}): Promise<PatchOrderResult> {
  const built = buildPatch({ body: params.body, allowed: assistantAllowedFields });
  if (!built.ok) return built;

  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: orders.id, status: orders.status, assistantUserId: orders.assistantUserId })
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    const row = existing[0];
    if (!row) return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };

    if (row.assistantUserId !== params.actorUserId) {
      return { ok: false, error: "FORBIDDEN", message: "Você não é o assistant responsável por esta order" };
    }

    if (row.status !== "in_progress" && row.status !== "follow_up") {
      return { ok: false, error: "INVALID_STATUS", message: `Order não pode ser editada (status=${row.status})` };
    }

    const updated = await tx
      .update(orders)
      .set({
        ...built.patch,
        updatedAt: sql`now()`
      })
      .where(
        and(
          eq(orders.id, params.orderId),
          eq(orders.assistantUserId, params.actorUserId),
          inArray(orders.status, ["in_progress", "follow_up"])
        )
      )
      .returning({
        id: orders.id,
        status: orders.status,
        updatedAt: orders.updatedAt,
        residentName: orders.residentName,
        addressLine1: orders.addressLine1,
        addressLine2: orders.addressLine2,
        city: orders.city,
        state: orders.state,
        zipCode: orders.zipCode,
        workTypeId: orders.workTypeId,
        isRush: orders.isRush,
        isVacant: orders.isVacant
      });

    if (!updated[0]) {
      return { ok: false, error: "INVALID_STATUS", message: "Order mudou durante a edição (concorrência)" };
    }

    return { ok: true, order: updated[0] };
  });
}

export async function patchOrderAsAdminOrMaster(params: {
  databaseUrl: string;
  orderId: string;
  body: unknown;
}): Promise<PatchOrderResult> {
  const built = buildPatch({ body: params.body, allowed: adminAllowedFields });
  if (!built.ok) return built;

  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, params.orderId))
    .limit(1);

  if (!existing[0]) return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };

  const updated = await db
    .update(orders)
    .set({
      ...built.patch,
      updatedAt: sql`now()`
    })
    .where(eq(orders.id, params.orderId))
    .returning({
      id: orders.id,
      status: orders.status,
      updatedAt: orders.updatedAt,
      residentName: orders.residentName,
      addressLine1: orders.addressLine1,
      addressLine2: orders.addressLine2,
      city: orders.city,
      state: orders.state,
      zipCode: orders.zipCode,
      workTypeId: orders.workTypeId,
      isRush: orders.isRush,
      isVacant: orders.isVacant,
      clientId: orders.clientId,
      inspectorAccountId: orders.inspectorAccountId,
      assignedInspectorId: orders.assignedInspectorId
    });

  if (!updated[0]) return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };

  return { ok: true, order: updated[0] };
}
