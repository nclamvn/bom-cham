import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

const FAMILY_PATH_PREFIX = "/family";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function resolveFamilyRoot(): string | null {
  // Resolve ui/family relative to the project root
  const candidates = [
    path.resolve(process.cwd(), "ui/family"),
    path.resolve(import.meta.dirname ?? process.cwd(), "../../ui/family"),
    path.resolve(import.meta.dirname ?? process.cwd(), "../../../ui/family"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }
  return null;
}

let cachedRoot: string | null | undefined;

export function handleFamilyPwaRequest(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const urlRaw = req.url;
  if (!urlRaw) return false;

  const url = new URL(urlRaw, "http://localhost");
  const pathname = url.pathname;

  // Only handle /family and /family/*
  if (pathname !== FAMILY_PATH_PREFIX && !pathname.startsWith(`${FAMILY_PATH_PREFIX}/`)) {
    return false;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return true;
  }

  // Redirect /family to /family/
  if (pathname === FAMILY_PATH_PREFIX) {
    res.statusCode = 302;
    res.setHeader("Location", `${FAMILY_PATH_PREFIX}/${url.search}`);
    res.end();
    return true;
  }

  if (cachedRoot === undefined) {
    cachedRoot = resolveFamilyRoot();
  }
  if (!cachedRoot) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Family PWA assets not found.");
    return true;
  }

  // Resolve relative path
  let rel = pathname.slice(FAMILY_PATH_PREFIX.length + 1); // strip /family/
  if (!rel || rel === "" || rel.endsWith("/")) {
    rel = (rel || "") + "index.html";
  }

  // Security: prevent path traversal
  const normalized = path.normalize(rel);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }

  const filePath = path.join(cachedRoot, normalized);
  if (!filePath.startsWith(cachedRoot)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      // Try index.html for SPA routing
      const indexPath = path.join(cachedRoot, "index.html");
      if (fs.existsSync(indexPath)) {
        serveFile(res, indexPath);
        return true;
      }
      res.statusCode = 404;
      res.end("Not Found");
      return true;
    }
    serveFile(res, filePath);
    return true;
  } catch {
    // File not found — serve index.html as SPA fallback
    const indexPath = path.join(cachedRoot, "index.html");
    if (fs.existsSync(indexPath)) {
      serveFile(res, indexPath);
      return true;
    }
    res.statusCode = 404;
    res.end("Not Found");
    return true;
  }
}

function serveFile(res: ServerResponse, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  // Cache static assets for 1 hour, HTML for no-cache
  const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=3600";

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("X-Content-Type-Options", "nosniff");

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on("error", () => {
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
}
