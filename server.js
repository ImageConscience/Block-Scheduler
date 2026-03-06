#!/usr/bin/env node
/**
 * Custom server: webhook routes use raw body (required for HMAC verification).
 * Other routes use standard React Router.
 */
import express from "express";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { createRequestHandler } from "@react-router/express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const buildPath = path.resolve(process.argv[2] || "./build/server/index.js");
  const build = await import(pathToFileURL(buildPath).href);
  const buildModule = build.default || build;

  const port = Number(process.env.PORT) || 3000;
  const app = express();

  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    "/assets",
    express.static(path.join(__dirname, "build/client/assets"), { immutable: true, maxAge: "1y" })
  );
  app.use(express.static(path.join(__dirname, "build/client"), { maxAge: "1h" }));
  app.use(express.static("public", { maxAge: "1h" }));
  app.use(morgan("tiny"));

  // Webhook routes: raw body only (no JSON parsing) - required for HMAC verification.
  // Match both /webhooks/* and /app/theme-stream/webhooks/* (Shopify sends to latter when app URL includes path)
  const pathRegex = /^\/(app\/theme-stream)?\/webhooks\/(app\/uninstalled|app\/scopes_update|compliance)$/;
  const { Readable } = await import("stream");
  app.post(
    pathRegex,
    express.raw({ type: () => true }), // Accept any content-type; must preserve exact bytes for HMAC
    async (req, res, next) => {
      const debugWebhooks = process.env.DEBUG_WEBHOOKS === "true";
      if (debugWebhooks) {
        console.log("[webhook]", req.path, "bodyLen:", req.body?.length ?? 0, "hasHmac:", !!req.get?.("x-shopify-hmac-sha256"));
      }
      try {
        // Preserve exact bytes - no string conversion (breaks HMAC)
        const rawBuffer = req.body instanceof Buffer ? req.body : Buffer.from(String(req.body ?? ""), "utf8");
        const bodyStream = Readable.from([rawBuffer]);
        // Rewrite path so React Router matches: /app/theme-stream/webhooks/x -> /webhooks/x
        const originalUrl = req.originalUrl || req.url;
        const rewrittenUrl = originalUrl.replace(/^\/app\/theme-stream/, "") || "/";
        const reqWithRawBody = Object.assign(bodyStream, {
          method: req.method,
          get: req.get?.bind(req),
          hostname: req.hostname,
          protocol: req.protocol,
          originalUrl: rewrittenUrl,
          url: rewrittenUrl,
          headers: req.headers,
          socket: req.socket,
          on: bodyStream.on?.bind(bodyStream),
        });
        const handler = createRequestHandler({
          build: buildModule,
          mode: process.env.NODE_ENV,
        });
        await handler(reqWithRawBody, res, (err) => {
          if (debugWebhooks && err) {
            console.error("[webhook] Handler error:", err?.message ?? err);
          }
          next(err);
        });
      } catch (err) {
        if (debugWebhooks) {
          console.error("[webhook] Error:", err?.message ?? err);
        }
        next(err);
      }
    }
  );

  app.all(
    "*",
    createRequestHandler({
      build: buildModule,
      mode: process.env.NODE_ENV,
    })
  );

  app.listen(port, () => {
    console.log(`[server] http://localhost:${port}`);
  });
}

function pathToFileURL(p) {
  return new URL(`file:${path.resolve(p).replace(/\\/g, "/")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
