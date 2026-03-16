import "dotenv/config";
import { buildApp } from "./app.js";
import { getEnv } from "./env.js";

const env = getEnv();
const app = await buildApp(env);

await app.listen({ port: env.port, host: env.host });
