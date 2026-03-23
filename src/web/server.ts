import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".woff": "application/font-woff",
  ".ttf": "application/font-ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "application/font-otf",
  ".wasm": "application/wasm",
};

export async function startServer(port: number = 3456) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    console.log(`${req.method} ${req.url}`);

    if (req.url?.startsWith("/api/")) {
      return handleApiRequest(req, res);
    }

    let filePath = join(PUBLIC_DIR, req.url === "/" ? "index.html" : req.url!);

    // Basic path traversal protection
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const s = await stat(filePath);
      if (s.isDirectory()) {
        filePath = join(filePath, "index.html");
      }

      const content = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    } catch (error: any) {
      if (error.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not Found");
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    }
  });

  server.listen(port, () => {
    console.log(`\nAgentDots Web UI running at: http://localhost:${port}`);
    console.log("Press Ctrl+C to stop.");
  });

  return server;
}
