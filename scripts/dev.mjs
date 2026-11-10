// Servidor local para probar la página sin Vercel: npm run dev → http://localhost:3000
// Si tenés KV_REST_API_URL y KV_REST_API_TOKEN en un archivo .env.local, usa tu base real de Upstash.
// Si no, levanta un Upstash simulado en memoria (se pierde al cerrar).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearFakeUpstash } from "./fake-upstash.mjs";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const envLocal = path.join(raiz, ".env.local");
if (fs.existsSync(envLocal)) {
  for (const linea of fs.readFileSync(envLocal, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
  const fake = crearFakeUpstash();
  process.env.KV_REST_API_URL = await fake.listen(0);
  process.env.KV_REST_API_TOKEN = "tok";
  console.log("Sin .env.local: usando una base simulada en memoria.");
} else {
  console.log("Usando la base de Upstash configurada en .env.local.");
}

const { default: disponibilidad } = await import("../api/disponibilidad.js");
const { default: inscripcion } = await import("../api/inscripcion.js");
const { default: tarea } = await import("../api/tarea.js");

http.createServer(async (req, res) => {
  const handler = req.url.startsWith("/api/disponibilidad") ? disponibilidad : req.url.startsWith("/api/inscripcion") ? inscripcion : req.url.startsWith("/api/tarea") ? tarea : null;
  if (handler) {
    let body = ""; for await (const c of req) body += c;
    req.body = body;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); };
    res.send = (t) => res.end(t);
    return handler(req, res);
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(fs.readFileSync(path.join(raiz, "public", "index.html")));
}).listen(3000, () => console.log("Página en http://localhost:3000"));
