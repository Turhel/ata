import { createClerkClient } from "@clerk/backend";

let cachedClient: ReturnType<typeof createClerkClient> | null = null;

function getClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  if (!cachedClient) cachedClient = createClerkClient({ secretKey });
  return cachedClient;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function fetchClerkAvatarUrls(
  clerkUserIds: string[],
): Promise<Map<string, string>> {
  const client = getClient();
  if (!client) return new Map();

  const ids = Array.from(
    new Set(
      (clerkUserIds || [])
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
        // We only support Clerk user ids ("user_...") here.
        .filter((id) => id.startsWith("user_")),
    ),
  );
  if (ids.length === 0) return new Map();

  const result = new Map<string, string>();

  for (const idsChunk of chunk(ids, 100)) {
    const res = await client.users.getUserList({ userId: idsChunk, limit: idsChunk.length });
    const data = (res as any)?.data ?? [];
    for (const u of data) {
      const id = u?.id ? String(u.id) : null;
      const imageUrl = u?.imageUrl ? String(u.imageUrl) : null;
      if (!id || !imageUrl) continue;
      result.set(id, imageUrl);
    }
  }

  return result;
}

