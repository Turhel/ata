import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

type AnyHandler = (req: VercelRequest, res: VercelResponse) => any | Promise<any>;
type HandlerModule = { default: AnyHandler };
type Loader = () => Promise<HandlerModule>;

async function run(req: VercelRequest, res: VercelResponse, loader: Loader) {
  const mod = await loader();
  return mod.default(req, res);
}

function withId(req: VercelRequest, id: string) {
  req.query = { ...req.query, id };
}

function getRouteSegments(req: VercelRequest): string[] {
  const routeParam = (req.query as any)?.route;

  const splitSegments = (v: string) =>
    v
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .map((s) => decodeURIComponent(s))
      .map((s) => s.trim())
      .filter(Boolean);

  if (Array.isArray(routeParam)) return routeParam.flatMap((p) => splitSegments(String(p)));
  if (routeParam != null) return splitSegments(String(routeParam));

  // fallback (should be rare)
  try {
    const u = new URL(String(req.url ?? ""), "http://localhost");
    const path = u.pathname || "";
    const prefix = "/api/work-types/";
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length);
      return rest.split("/").map(decodeURIComponent).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const route = getRouteSegments(req);
    const path = route.join("/");

    if (route[0] && route[0] !== "index") {
      withId(req, route[0]);
      return run(req, res, () => import("../../server/api/work-types/[id].js"));
    }
    if (path === "" || path === "index") {
      return run(req, res, () => import("../../server/api/work-types/index.js"));
    }
    return res.status(404).json({ ok: false, error: "Route not found", path: `work-types/${path}` });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

