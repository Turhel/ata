import { createServer } from "node:http";

const port = Number(process.env.PORT || 3000);

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end("<!doctype html><html><head><title>API-only dev</title></head><body>API-only dev</body></html>");
});

server.listen(port, () => {
  console.log(`API-only dev listening on ${port}`);
});
