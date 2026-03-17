import "dotenv/config";
import { buildApp } from "./app.js";
import { getEnv } from "./env.js";

const env = getEnv();
const app = await buildApp(env);

let closing = false;

async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, "Encerrando API");

  try {
    await app.close();
    app.log.info("API encerrada");
    process.exit(0);
  } catch (error) {
    app.log.error({ error, signal }, "Falha ao encerrar API");
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.port, host: env.host });
  app.log.info(
    {
      host: env.host,
      port: env.port,
      appEnv: env.appEnv
    },
    "API iniciada"
  );
} catch (error) {
  app.log.error({ error }, "Falha ao iniciar API");
  process.exit(1);
}
