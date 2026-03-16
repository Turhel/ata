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

  // Vercel may pass catch-all param as:
  // - string[] (["legacy","open-balance"])
  // - string ("legacy/open-balance")
  if (Array.isArray(routeParam)) {
    return routeParam.flatMap((p) => splitSegments(String(p)));
  }
  if (routeParam != null) {
    return splitSegments(String(routeParam));
  }

  try {
    const u = new URL(String(req.url ?? ""), "http://localhost");
    const path = u.pathname || "";
    const prefix = "/api/";
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length);
      return rest.split("/").map(decodeURIComponent).filter(Boolean);
    }

    if (path.startsWith("/")) {
      return path.slice(1).split("/").map(decodeURIComponent).filter(Boolean);
    }

    return [];
  } catch {
    return [];
  }
}

async function dispatchLegacy(req: VercelRequest, res: VercelResponse, legacyRoute: string[]) {
  const route = legacyRoute;
  const path = route.join("/");

  // Prefer migrated handlers when available (keeps legacy route shapes working).
  if (path === "audit-logs") return run(req, res, () => import("../server/api/audit-logs.js"));
  if (path === "inspector-route-notes") return run(req, res, () => import("../server/api/inspector-route-notes.js"));
  if (path === "inspectors") return run(req, res, () => import("../server/api/inspectors/index.js"));
  if (path === "notification-preferences") {
    return run(req, res, () => import("../server/api/notification-preferences.js"));
  }
  if (path === "open-balance") return run(req, res, () => import("../server/api/payments/open-balance.js"));
  if (path === "order-followups") return run(req, res, () => import("../server/api/orders/followups.js"));
  if (path === "order-history") return run(req, res, () => import("../server/api/orders/history.js"));
  if (path === "order-import-holds") return run(req, res, () => import("../server/api/orders/import-holds.js"));
  if (path === "order-stats") return run(req, res, () => import("../server/api/orders/stats.js"));
  if (path === "payment-batch-items") {
    return run(req, res, () => import("../server/api/payments/batch-items/index.js"));
  }
  if (path === "payment-batches") return run(req, res, () => import("../server/api/payments/batches/index.js"));
  if (path === "payment-requests") {
    return run(req, res, () => import("../server/api/payments/requests-legacy/index.js"));
  }
  if (path === "pool-import-batches") return run(req, res, () => import("../server/api/pool/import-batches.js"));
  if (path === "pool-orders") return run(req, res, () => import("../server/api/pool/orders.js"));
  if (path === "profiles") return run(req, res, () => import("../server/api/users/profiles.js"));
  if (path === "scope-summaries") return run(req, res, () => import("../server/api/scopes/summaries.js"));
  if (path === "user-roles") return run(req, res, () => import("../server/api/user-roles.js"));

  if (route[0] === "duplicate-requests") {
    if (route[1] === "check") return run(req, res, () => import("../server/api/requests/duplicate/check.js"));
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/requests/duplicate/[id].js"));
    }
    return run(req, res, () => import("../server/api/requests/duplicate/index.js"));
  }

  if (route[0] === "inspection-scopes") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/scopes/[id].js"));
    }
    return run(req, res, () => import("../server/api/scopes/index.js"));
  }

  if (route[0] === "invitations") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/invitations/[id].js"));
    }
    return run(req, res, () => import("../server/api/invitations/index.js"));
  }

  if (route[0] === "manuals") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/manuals/[id].js"));
    }
    return run(req, res, () => import("../server/api/manuals/index.js"));
  }

  if (route[0] === "notifications") {
    if (route[1] === "exists") return run(req, res, () => import("../server/api/notifications/exists.js"));
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/notifications/[id].js"));
    }
    return run(req, res, () => import("../server/api/notifications/index.js"));
  }

  if (route[0] === "orders") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/orders/legacy/[id].js"));
    }
    return run(req, res, () => import("../server/api/orders/legacy/index.js"));
  }

  if (route[0] === "payment-batches") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/payments/batches/[id].js"));
    }
    return run(req, res, () => import("../server/api/payments/batches/index.js"));
  }

  if (route[0] === "payment-requests") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/payments/requests-legacy/[id].js"));
    }
    return run(req, res, () => import("../server/api/payments/requests-legacy/index.js"));
  }

  if (route[0] === "pool-import-batches") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/pool/import-batches/[id].js"));
    }
    return run(req, res, () => import("../server/api/pool/import-batches.js"));
  }

  if (route[0] === "pricing") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/pricing/[id].js"));
    }
    return run(req, res, () => import("../server/api/pricing/index.js"));
  }

  if (route[0] === "team-assignments") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/team-assignments/[id].js"));
    }
    return run(req, res, () => import("../server/api/team-assignments/index.js"));
  }

  if (route[0] === "work-type-requests") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/requests/work-type/[id].js"));
    }
    return run(req, res, () => import("../server/api/requests/work-type/index.js"));
  }

  if (route[0] === "work-types") {
    if (route[1] && route[1] !== "index") {
      withId(req, route[1]);
      return run(req, res, () => import("../server/api/work-types/[id].js"));
    }
    return run(req, res, () => import("../server/api/work-types/index.js"));
  }

  return res.status(404).json({ ok: false, error: "Route not found", path: `legacy/${path}` });
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
    const path = route.join("/");

    if (path === "health") return run(req, res, () => import("../server/api/health.js"));
    if (path === "env-check") return run(req, res, () => import("../server/api/env-check.js"));
    if (path === "me") return run(req, res, () => import("../server/api/me.js"));
    if (path === "onboarding") return run(req, res, () => import("../server/api/onboarding.js"));

    if (route[0] === "metrics" && route[1] === "daily") {
      return run(req, res, () => import("../server/api/metrics/daily.js"));
    }
    if (route[0] === "archive" && route[1] === "orders") {
      return run(req, res, () => import("../server/api/archive/orders.js"));
    }

    if (route[0] === "inspectors" && route[1] === "assignments") {
      if (route[2] && route[2] !== "index") {
        withId(req, route[2]);
        return run(req, res, () => import("../server/api/inspectors/assignments/[id].js"));
      }
      return run(req, res, () => import("../server/api/inspectors/assignments/index.js"));
    }

    if (route[0] === "manuals") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/manuals/[id].js"));
      }
      return run(req, res, () => import("../server/api/manuals/index.js"));
    }

    if (route[0] === "invitations") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/invitations/[id].js"));
      }
      return run(req, res, () => import("../server/api/invitations/index.js"));
    }

    if (route[0] === "audit-logs") {
      return run(req, res, () => import("../server/api/audit-logs.js"));
    }

    if (route[0] === "inspector-route-notes") {
      return run(req, res, () => import("../server/api/inspector-route-notes.js"));
    }

    if (route[0] === "team-assignments") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/team-assignments/[id].js"));
      }
      return run(req, res, () => import("../server/api/team-assignments/index.js"));
    }

    if (route[0] === "profiles") {
      return run(req, res, () => import("../server/api/users/profiles.js"));
    }

    if (route[0] === "user-roles") {
      return run(req, res, () => import("../server/api/user-roles.js"));
    }

    if (route[0] === "work-types") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/work-types/[id].js"));
      }
      return run(req, res, () => import("../server/api/work-types/index.js"));
    }

    // Vercel catch-all `api/inspectors/[...route].ts` doesn't match the base path `/api/inspectors`
    // (it only matches `/api/inspectors/*`). Route the base path here.
    if (route[0] === "inspectors" && (!route[1] || route[1] === "index")) {
      return run(req, res, () => import("../server/api/inspectors/index.js"));
    }

    if (route[0] === "legacy") {
      const legacyPath = route.slice(1).join("/");
      const disableLegacy =
        process.env.DISABLE_API_LEGACY === "true" ||
        process.env.DISABLE_API_LEGACY === "1" ||
        process.env.DISABLE_API_LEGACY === "yes";
      const logLegacy =
        process.env.LOG_API_LEGACY === "true" ||
        process.env.LOG_API_LEGACY === "1" ||
        process.env.LOG_API_LEGACY === "yes";

      if (logLegacy) {
        console.info("[api] legacy request", { method: req.method, path: legacyPath || "/" });
      }
      if (disableLegacy) {
        return res.status(410).json({
          ok: false,
          error: "Legacy API disabled",
          path: `legacy/${legacyPath}`,
        });
      }
      return dispatchLegacy(req, res, route.slice(1));
    }

    // Compat: keep legacy "duplicate-requests" route shape, but run the migrated handler.
    if (route[0] === "duplicate-requests") {
      if (route[1] === "check") {
        return run(req, res, () => import("../server/api/requests/duplicate/check.js"));
      }
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/requests/duplicate/[id].js"));
      }
      return run(req, res, () => import("../server/api/requests/duplicate/index.js"));
    }

    // Compat: keep legacy "work-type-requests" route shape, but run the migrated handler.
    if (route[0] === "work-type-requests") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/requests/work-type/[id].js"));
      }
      return run(req, res, () => import("../server/api/requests/work-type/index.js"));
    }

    // Planned namespaces (keep shapes stable, migrate handlers later)
    if (route[0] === "users" && route[1] === "profiles") {
      return run(req, res, () => import("../server/api/users/profiles.js"));
    }

    if (route[0] === "requests") {
      if (route[1] === "duplicate") {
        if (route[2] === "check") {
          return run(req, res, () => import("../server/api/requests/duplicate/check.js"));
        }
        if (route[2] && route[2] !== "index") {
          withId(req, route[2]);
          return run(req, res, () => import("../server/api/requests/duplicate/[id].js"));
        }
        return run(req, res, () => import("../server/api/requests/duplicate/index.js"));
      }
      if (route[1] === "work-type") {
        if (route[2] && route[2] !== "index") {
          withId(req, route[2]);
          return run(req, res, () => import("../server/api/requests/work-type/[id].js"));
        }
        return run(req, res, () => import("../server/api/requests/work-type/index.js"));
      }
    }

    if (route[0] === "pool") {
      if (route[1] === "orders") return run(req, res, () => import("../server/api/pool/orders.js"));
      if (route[1] === "import-batches") {
        return run(req, res, () => import("../server/api/pool/import-batches.js"));
      }
    }

    if (route[0] === "notifications") {
      if (route[1] === "exists") return run(req, res, () => import("../server/api/notifications/exists.js"));
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/notifications/[id].js"));
      }
      return run(req, res, () => import("../server/api/notifications/index.js"));
    }

    if (route[0] === "notification-preferences") {
      return run(req, res, () => import("../server/api/notification-preferences.js"));
    }

    if (route[0] === "open-balance") {
      return run(req, res, () => import("../server/api/payments/open-balance.js"));
    }

    if (route[0] === "orders") {
      if (route[1] === "followups") return run(req, res, () => import("../server/api/orders/followups.js"));
      if (route[1] === "history") return run(req, res, () => import("../server/api/orders/history.js"));
      if (route[1] === "stats") return run(req, res, () => import("../server/api/orders/stats.js"));
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/orders/[id].js"));
      }
      return run(req, res, () => import("../server/api/orders/index.js"));
    }

    if (route[0] === "scopes") {
      if (route[1] === "lookup") return run(req, res, () => import("../server/api/scopes/lookup.js"));
      if (route[1] === "summaries") return run(req, res, () => import("../server/api/scopes/summaries.js"));
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/scopes/[id].js"));
      }
      return run(req, res, () => import("../server/api/scopes/index.js"));
    }

    if (route[0] === "payments") {
      if (route[1] === "requests") {
        if (route[2] && route[2] !== "index") {
          withId(req, route[2]);
          return run(req, res, () => import("../server/api/payments/requests/[id].js"));
        }
        return run(req, res, () => import("../server/api/payments/requests/index.js"));
      }
      if (route[1] === "batches") {
        if (route[2] && route[2] !== "index") {
          withId(req, route[2]);
          return run(req, res, () => import("../server/api/payments/batches/[id].js"));
        }
        return run(req, res, () => import("../server/api/payments/batches/index.js"));
      }
      if (route[1] === "batch-items") {
        return run(req, res, () => import("../server/api/payments/batch-items/index.js"));
      }
    }

    if (route[0] === "work-types") {
      if (route[1] && route[1] !== "index") {
        withId(req, route[1]);
        return run(req, res, () => import("../server/api/work-types/[id].js"));
      }
      return run(req, res, () => import("../server/api/work-types/index.js"));
    }

    return res.status(404).json({ ok: false, error: "Route not found", path });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
