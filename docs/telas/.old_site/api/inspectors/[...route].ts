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

  if (Array.isArray(routeParam)) {
    return routeParam.flatMap((p) => splitSegments(String(p)));
  }
  if (routeParam != null) {
    return splitSegments(String(routeParam));
  }

  try {
    const u = new URL(String(req.url ?? ""), "http://localhost");
    const path = u.pathname || "";
    const prefix = "/api/inspectors/";
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

    if (route[0] === "assignments") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../../server/api/inspectors/assignments/[id].js"));
      }
      return run(req, res, () => import("../../server/api/inspectors/assignments/index.js"));
    }

    if (path === "" || path === "index") {
      return run(req, res, () => import("../../server/api/inspectors/index.js"));
    }
    return res.status(404).json({ ok: false, error: "Route not found", path: `inspectors/${path}` });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

