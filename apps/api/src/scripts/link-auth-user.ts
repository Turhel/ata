import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import { users } from "../db/schema.js";

function usage() {
  console.log("Uso:");
  console.log("  pnpm -C apps/api dev:link-auth-user <operational_email> <auth_user_id>");
  console.log("");
  console.log("Exemplo:");
  console.log("  $env:DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/ata_portal\"");
  console.log("  pnpm -C apps/api dev:link-auth-user admin@dev.local a1b2c3d4");
}

const [, , emailRaw, authUserIdRaw] = process.argv;
const email = (emailRaw ?? "").trim().toLowerCase();
const authUserId = (authUserIdRaw ?? "").trim();

if (!email || !authUserId) {
  usage();
  process.exit(1);
}

const databaseUrl = (process.env.DATABASE_URL ?? "").trim();
if (!databaseUrl) {
  console.error("Erro: DATABASE_URL n\u00e3o definido.");
  process.exit(1);
}

const { db, pool } = getDb(databaseUrl);

try {
  const target = await db
    .select({ id: users.id, email: users.email, authUserId: users.authUserId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!target[0]) {
    console.error(`Erro: nenhum usu\u00e1rio operacional encontrado com email '${email}'.`);
    process.exit(1);
  }

  const current = target[0];
  if (current.authUserId && current.authUserId === authUserId) {
    console.log("Nada a fazer: este usu\u00e1rio j\u00e1 est\u00e1 vinculado a esse auth_user_id.");
    process.exit(0);
  }

  if (current.authUserId && current.authUserId !== authUserId) {
    console.error(
      `Erro: o usu\u00e1rio '${email}' j\u00e1 possui auth_user_id vinculado ('${current.authUserId}').`
    );
    process.exit(1);
  }

  const conflict = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.authUserId, authUserId), isNotNull(users.authUserId)))
    .limit(1);

  if (conflict[0] && conflict[0].id !== current.id) {
    console.error(
      `Erro: auth_user_id '${authUserId}' j\u00e1 est\u00e1 vinculado ao usu\u00e1rio operacional '${conflict[0].email}'.`
    );
    process.exit(1);
  }

  const updated = await db
    .update(users)
    .set({ authUserId, updatedAt: sql`now()` })
    .where(eq(users.id, current.id))
    .returning({ id: users.id, email: users.email, authUserId: users.authUserId });

  if (!updated[0]) {
    console.error("Erro: falha ao atualizar auth_user_id.");
    process.exit(1);
  }

  console.log("V\u00ednculo aplicado com sucesso:");
  console.log(`- email: ${updated[0].email}`);
  console.log(`- auth_user_id: ${updated[0].authUserId}`);
} finally {
  await pool.end();
}

