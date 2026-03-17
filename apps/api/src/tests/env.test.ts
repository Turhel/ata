import assert from "node:assert/strict";
import test from "node:test";
import { getEnv } from "../env.js";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("getEnv aceita secret curto apenas em development", () => {
  withEnv(
    {
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "curto",
      BETTER_AUTH_URL: "http://localhost:3001",
      APP_WEB_URL: "http://localhost:5173"
    },
    () => {
      const env = getEnv();
      assert.equal(env.appEnv, "development");
      assert.equal(env.betterAuthSecret, "curto");
    }
  );
});

test("getEnv rejeita secret curto fora de development", () => {
  withEnv(
    {
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "curto",
      BETTER_AUTH_URL: "http://localhost:3001",
      APP_WEB_URL: "http://localhost:5173"
    },
    () => {
      assert.throws(
        () => getEnv(),
        /BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres/
      );
    }
  );
});

test("getEnv valida URLs configuradas", () => {
  withEnv(
    {
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "12345678901234567890123456789012",
      BETTER_AUTH_URL: "url-invalida",
      APP_WEB_URL: "http://localhost:5173"
    },
    () => {
      assert.throws(() => getEnv(), /BETTER_AUTH_URL inválido/);
    }
  );
});
