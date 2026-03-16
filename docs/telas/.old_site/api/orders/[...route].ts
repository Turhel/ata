import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

type AnyHandler = (req: VercelRequest, res: VercelResponse) => any | Promise<any>;

type HandlerModule = { default: AnyHandler };
type Loader = () => Promise<HandlerModule>;

function installWarningTrace() {
  const g = globalThis as any;
  if (g.__ata_warning_trace_installed) return;
  g.__ata_warning_trace_installed = true;

  const enabled =
    process.env.TRACE_NODE_WARNING_STACK === "true" ||
    process.env.TRACE_NODE_WARNING_STACK === "1" ||
    process.env.TRACE_NODE_WARNING_STACK === "yes";
  if (!enabled) return;

  process.on("warning", (w: any) => {
    try {
      if (w?.name === "DeprecationWarning" && String(w?.code ?? "") === "DEP0169") {
        console.error("[node-warning]", {
          name: w?.name,
          code: w?.code,
          message: w?.message,
          stack: w?.stack,
        });
      }
    } catch {
      // ignore
    }
  });
}

installWarningTrace();

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
    const prefix = "/api/orders/";
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

    const route = getRouteSegments(req);

    if (route[0] === "import-holds") {
      return run(req, res, () => import("../../server/api/orders/import-holds.js"));
    }
    if (route[0] === "followups") return run(req, res, () => import("../../server/api/orders/followups.js"));
    if (route[0] === "pending-summary") {
      return run(req, res, () => import("../../server/api/orders/pending-summary.js"));
    }
    if (route[0] === "performance") {
      return run(req, res, () => import("../../server/api/orders/performance.js"));
    }
    if (route[0] === "team-performance") {
      return run(req, res, () => import("../../server/api/orders/team-performance.js"));
    }
    if (route[0] === "team-approvals") {
      return run(req, res, () => import("../../server/api/orders/team-approvals.js"));
    }
    if (route[0] === "team-approvals-summary") {
      return run(req, res, () => import("../../server/api/orders/team-approvals-summary.js"));
    }
    if (route[0] === "assistants-activity") {
      return run(req, res, () => import("../../server/api/orders/assistants-activity.js"));
    }
    if (route[0] === "team-payments") {
      return run(req, res, () => import("../../server/api/orders/team-payments.js"));
    }
    if (route[0] === "history") return run(req, res, () => import("../../server/api/orders/history.js"));
    if (route[0] === "stats") return run(req, res, () => import("../../server/api/orders/stats.js"));
    if (route[0] && route[0] !== "index") {
      withId(req, route[0]);
      return run(req, res, () => import("../../server/api/orders/[id].js"));
    }
    return run(req, res, () => import("../../server/api/orders/index.js"));
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
