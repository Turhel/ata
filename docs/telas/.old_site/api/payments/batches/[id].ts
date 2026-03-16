import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

function setNoStore(res: VercelResponse) {
  // Avoid browser/proxy caching for authenticated API responses (prevents 304 + empty body issues)
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const existingVary = res.getHeader("Vary");
  const varyStr =
    typeof existingVary === "string"
      ? existingVary
      : Array.isArray(existingVary)
        ? existingVary.join(",")
        : "";
  if (!varyStr.toLowerCase().includes("authorization")) {
    res.setHeader("Vary", varyStr ? `${varyStr}, Authorization` : "Authorization");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setNoStore(res);
    const mod = await import("../../../server/api/payments/ledger/batches/[id].js");
    return mod.default(req, res);
  } catch (err: any) {
    return res.status(503).json({
      ok: false,
      error: "Payments ledger unavailable",
      warning: { code: "payments_ledger_unavailable", error: err?.message ?? "Payments ledger unavailable" },
    });
  }
}

