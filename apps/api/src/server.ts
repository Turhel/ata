import { buildApp } from "./app.js";
import { getEnv } from "./env.js";

const env = getEnv();
const app = buildApp(env);

await app.listen({ port: env.port, host: env.host });
