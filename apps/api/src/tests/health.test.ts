import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../app.js";
import type { ApiEnv } from "../env.js";

function buildTestEnv(): ApiEnv {
  return {
    host: "127.0.0.1",
    port: 3001,
    appEnv: "development",
    logLevel: "fatal",
    appWebUrl: "http://localhost:5173",
    betterAuthSecret: "12345678901234567890123456789012",
    betterAuthUrl: "http://localhost:3001",
    databaseUrl: "postgresql://postgres:postgres@localhost:5432/ata_portal",
    nominatimBaseUrl: "http://localhost:8080",
    routingEngineBaseUrl: "http://localhost:5000"
  };
}

test("/health expõe app, serviços configurados e estado do banco", async () => {
  const app = await buildApp(buildTestEnv());

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      ok: true;
      app: { env: string; uptimeSeconds: number; timestamp: string };
      services: {
        betterAuth: { configured: boolean };
        nominatim: { configured: boolean };
        routingEngine: { configured: boolean };
      };
      db: { ok: boolean; error?: string };
    };

    assert.equal(body.ok, true);
    assert.equal(body.app.env, "development");
    assert.equal(typeof body.app.uptimeSeconds, "number");
    assert.equal(body.services.betterAuth.configured, true);
    assert.equal(body.services.nominatim.configured, true);
    assert.equal(body.services.routingEngine.configured, true);
    assert.equal(typeof body.db.ok, "boolean");
    if (!body.db.ok) {
      assert.ok((body.db.error ?? "").length > 0);
    }
  } finally {
    await app.close();
  }
});

