import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Keep /api/legacy/* URLs working, but unify routing in the root catch-all.
    const mod = await import("../[...route].js");

    // Ensure the root router interprets this request as legacy even if Vercel provided
    // the catch-all param without the "legacy" prefix.
    const routeParam = (req.query as any)?.route;
    const normalized =
      routeParam == null ? [] : Array.isArray(routeParam) ? routeParam.map(String) : [String(routeParam)];
    (req.query as any) = { ...(req.query as any), route: ["legacy", ...normalized] };

    // Avoid browser/proxy caching for authenticated API responses (prevents 304 + empty body issues)
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return mod.default(req, res);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
