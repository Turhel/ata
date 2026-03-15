import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { teamAssignments, userRoles, users } from "../db/schema.js";
import { getDb } from "../lib/db.js";
import { createTeamAssignment } from "../modules/team-assignments/create-team-assignment.js";
import { deactivateTeamAssignment } from "../modules/team-assignments/deactivate-team-assignment.js";
import { listTeamAssignments } from "../modules/team-assignments/list-team-assignments.js";
import { changeUserRole } from "../modules/users/change-user-role.js";

const databaseUrl = process.env.DATABASE_URL;

const integration = databaseUrl ? test : test.skip;

integration("changeUserRole troca a role ativa e preserva histórico", async (t) => {
  const { db } = getDb(databaseUrl!);
  const adminId = randomUUID();
  const targetId = randomUUID();
  const adminEmail = `admin-${randomUUID()}@test.local`;
  const targetEmail = `assistant-${randomUUID()}@test.local`;

  await db.insert(users).values([
    { id: adminId, email: adminEmail, fullName: "Admin Test", status: "active", authUserId: null },
    { id: targetId, email: targetEmail, fullName: "Target Test", status: "active", authUserId: null }
  ]);

  await db.insert(userRoles).values([
    { id: randomUUID(), userId: adminId, roleCode: "master", assignedByUserId: adminId, isActive: true },
    { id: randomUUID(), userId: targetId, roleCode: "assistant", assignedByUserId: adminId, isActive: true }
  ]);

  t.after(async () => {
    await db.delete(userRoles).where(and(eq(userRoles.userId, adminId), eq(userRoles.assignedByUserId, adminId)));
    await db.delete(userRoles).where(eq(userRoles.userId, targetId));
    await db.delete(users).where(eq(users.id, targetId));
    await db.delete(users).where(eq(users.id, adminId));
  });

  const result = await changeUserRole({
    databaseUrl: databaseUrl!,
    actorUserId: adminId,
    actorRole: "master",
    targetUserId: targetId,
    roleCode: "inspector"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.role.roleCode, "inspector");

  const targetRoles = await db
    .select({ roleCode: userRoles.roleCode, isActive: userRoles.isActive })
    .from(userRoles)
    .where(eq(userRoles.userId, targetId));

  assert.equal(targetRoles.filter((row) => row.isActive).length, 1);
  assert.equal(targetRoles.find((row) => row.isActive)?.roleCode, "inspector");
  assert.ok(targetRoles.some((row) => !row.isActive && row.roleCode === "assistant"));
});

integration("team assignments criam, listam e encerram vínculo ativo", async (t) => {
  const { db } = getDb(databaseUrl!);
  const masterId = randomUUID();
  const adminId = randomUUID();
  const assistantId = randomUUID();

  await db.insert(users).values([
    { id: masterId, email: `master-${randomUUID()}@test.local`, fullName: "Master Test", status: "active", authUserId: null },
    { id: adminId, email: `admin-${randomUUID()}@test.local`, fullName: "Admin Team Test", status: "active", authUserId: null },
    { id: assistantId, email: `assistant-${randomUUID()}@test.local`, fullName: "Assistant Team Test", status: "active", authUserId: null }
  ]);

  await db.insert(userRoles).values([
    { id: randomUUID(), userId: masterId, roleCode: "master", assignedByUserId: masterId, isActive: true },
    { id: randomUUID(), userId: adminId, roleCode: "admin", assignedByUserId: masterId, isActive: true },
    { id: randomUUID(), userId: assistantId, roleCode: "assistant", assignedByUserId: adminId, isActive: true }
  ]);

  t.after(async () => {
    await db.delete(teamAssignments).where(eq(teamAssignments.assistantUserId, assistantId));
    await db.delete(userRoles).where(eq(userRoles.userId, assistantId));
    await db.delete(userRoles).where(eq(userRoles.userId, adminId));
    await db.delete(userRoles).where(eq(userRoles.userId, masterId));
    await db.delete(users).where(eq(users.id, assistantId));
    await db.delete(users).where(eq(users.id, adminId));
    await db.delete(users).where(eq(users.id, masterId));
  });

  const created = await createTeamAssignment({
    databaseUrl: databaseUrl!,
    actorUserId: adminId,
    actorRole: "admin",
    body: { assistantUserId: assistantId }
  });

  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.assignment.adminUserId, adminId);
  assert.equal(created.assignment.assistantUserId, assistantId);

  const listed = await listTeamAssignments({
    databaseUrl: databaseUrl!,
    actorUserId: adminId,
    actorRole: "admin",
    includeInactive: false,
    scope: "all"
  });

  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.assistantUserId, assistantId);

  const deactivated = await deactivateTeamAssignment({
    databaseUrl: databaseUrl!,
    actorUserId: adminId,
    actorRole: "admin",
    assignmentId: created.assignment.id
  });

  assert.equal(deactivated.ok, true);
  if (!deactivated.ok) return;
  assert.equal(deactivated.assignment.isActive, false);
  assert.ok(deactivated.assignment.endDate);
});
