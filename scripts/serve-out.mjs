// Minimal static server for the `out/` export, mounted under the GitHub Pages base path.
// Used for local previews, Playwright e2e tests, screenshots and Lighthouse.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const BASE_PATH = "/akis-kanban";
const ROOT = resolve(process.argv[2] ?? "out");
const PORT = Number(process.env.PORT ?? 5302);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function resolveFile(pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidate = join(ROOT, relative);
  if (!candidate.startsWith(ROOT)) return null;
  for (const file of [candidate, join(candidate, "index.html"), `${candidate}.html`]) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function send(response, status, file) {
  const immutable = file.includes(`${join("_next", "static")}`);
  response.writeHead(status, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(file).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname === "/" || url.pathname === BASE_PATH) {
    response.writeHead(302, { Location: `${BASE_PATH}/${url.search}` });
    response.end();
    return;
  }
  if (!url.pathname.startsWith(`${BASE_PATH}/`)) {
    response.writeHead(404).end("Not found");
    return;
  }
  const file = await resolveFile(url.pathname.slice(BASE_PATH.length));
  if (file) return send(response, 200, file);
  const notFound = await resolveFile("/404.html");
  if (notFound) return send(response, 404, notFound);
  response.writeHead(404).end("Not found");
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE_PATH}/`);
});
