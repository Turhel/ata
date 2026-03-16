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
    const prefix = "/api/payments/";
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

    if (route[0] === "open-balance") {
      const mod = await import("../../server/api/payments/open-balance.js");
      return mod.default(req, res);
    }

    if (route[0] === "week-summary") {
      return run(req, res, () => import("../../server/api/payments/week-summary.js"));
    }

    if (route[0] === "requests") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../../server/api/payments/requests/[id].js"));
      }
      return run(req, res, () => import("../../server/api/payments/requests/index.js"));
    }

    if (route[0] === "batches") {
      try {
        if (route[1] && route[1] !== "index") {
          withId(req, route[1]);
          const mod = await import("../../server/api/payments/ledger/batches/[id].js");
          return mod.default(req, res);
        }
        const mod = await import("../../server/api/payments/ledger/batches/index.js");
        return mod.default(req, res);
      } catch (err: any) {
        // If the ledger can't load (missing deps/env), keep GET UIs usable but fail writes explicitly.
        if (req.method === "GET") {
          return res.status(200).json({
            ok: true,
            batches: [],
            warning: { code: "payments_ledger_unavailable", error: err?.message ?? "Payments ledger unavailable" },
          });
        }
        return res.status(503).json({
          ok: false,
          error: "Payments ledger unavailable",
          warning: { code: "payments_ledger_unavailable", error: err?.message ?? "Payments ledger unavailable" },
        });
      }
    }

    if (route[0] === "batch-items") {
      try {
        const mod = await import("../../server/api/payments/ledger/batch-items/index.js");
        return mod.default(req, res);
      } catch (err: any) {
        if (req.method === "GET") {
          return res.status(200).json({
            ok: true,
            items: [],
            warning: { code: "payments_ledger_unavailable", error: err?.message ?? "Payments ledger unavailable" },
          });
        }
        return res.status(503).json({
          ok: false,
          error: "Payments ledger unavailable",
          warning: { code: "payments_ledger_unavailable", error: err?.message ?? "Payments ledger unavailable" },
        });
      }
    }

    if (route[0] === "ledger") {
      if (route[1] === "sync-week") {
        const mod = await import("../../server/api/payments/ledger/sync-week.js");
        return mod.default(req, res);
      }
    }

    return res.status(404).json({ ok: false, error: "Route not found", path: `payments/${route.join("/")}` });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
