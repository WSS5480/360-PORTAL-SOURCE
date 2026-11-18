/**
 * Loopback stand-in for Nimble fulfillment callbacks.
 * Listens only on 127.0.0.1 and never calls an external service.
 */
import { createServer } from "node:http";
import { appendFileSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = 9099;
const logPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "mock-nimble.log");
const failOncePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "mock-nimble.fail-once");
const failInvoicePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "mock-nimble.fail-invoice");
const calls = [];

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const entry = {
      at: new Date().toISOString(),
      method: req.method,
      url: req.url,
      hasAuthorization: Boolean(req.headers.authorization),
      body: body.slice(0, 500),
    };
    calls.push(entry);
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
    const failInvoice = req.method === "PATCH" && String(req.url || "").endsWith("/invoice") && existsSync(failInvoicePath);
    const failOnce = req.method === "PUT" && existsSync(failOncePath);
    if (failInvoice) unlinkSync(failInvoicePath);
    if (failOnce) unlinkSync(failOncePath);
    const fail = failInvoice || failOnce;
    res.writeHead(fail ? 500 : 200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: !fail }));
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock nimble listening on http://127.0.0.1:${port}`);
});
