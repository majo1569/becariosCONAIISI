// Servidor que imita la API REST de Upstash Redis, con datos en memoria.
// Se usa solo para pruebas y desarrollo local: el código de la API habla con él igual que con Upstash.
import http from "node:http";

export function crearFakeUpstash({ token = "tok" } = {}) {
  const kv = new Map(), h = new Map(), l = new Map();

  function run(c) {
    const [cmd, ...a] = c.map(String);
    switch (cmd.toUpperCase()) {
      case "SET": {
        const nx = a.slice(2).map((x) => x.toUpperCase()).includes("NX");
        if (nx && kv.has(a[0])) return null;
        kv.set(a[0], a[1]); return "OK";
      }
      case "HSET": {
        const m = h.get(a[0]) || new Map(); h.set(a[0], m); let n = 0;
        for (let i = 1; i < a.length; i += 2) { if (!m.has(a[i])) n++; m.set(a[i], a[i + 1]); }
        return n;
      }
      case "HSETNX": {
        const m = h.get(a[0]) || new Map(); h.set(a[0], m);
        if (m.has(a[1])) return 0; m.set(a[1], a[2]); return 1;
      }
      case "HGET": { const m = h.get(a[0]); return m && m.has(a[1]) ? m.get(a[1]) : null; }
      case "HLEN": { const m = h.get(a[0]); return m ? m.size : 0; }
      case "HEXISTS": { const m = h.get(a[0]); return m && m.has(a[1]) ? 1 : 0; }
      case "HDEL": { const m = h.get(a[0]); let n = 0; if (m) a.slice(1).forEach((f) => { if (m.delete(f)) n++; }); return n; }
      case "HGETALL": { const m = h.get(a[0]); return m ? [...m].flat() : []; }
      case "LPUSH": { const x = l.get(a[0]) || []; l.set(a[0], x); a.slice(1).forEach((v) => x.unshift(v)); return x.length; }
      case "LRANGE": { const x = l.get(a[0]) || []; let e = +a[2]; if (e < 0) e = x.length + e; return x.slice(+a[1], e + 1); }
      default: throw new Error("Comando no soportado en el simulador: " + cmd);
    }
  }
  const enc = (v, b) => !b ? v : Array.isArray(v) ? v.map((x) => enc(x, b)) : typeof v === "string" ? Buffer.from(v).toString("base64") : v;

  const server = http.createServer(async (req, res) => {
    let body = ""; for await (const c of req) body += c;
    const b64 = (req.headers["upstash-encoding"] || "") === "base64";
    res.setHeader("Content-Type", "application/json");
    if (req.headers.authorization !== "Bearer " + token) { res.statusCode = 401; return res.end('{"error":"Unauthorized"}'); }
    try {
      const j = JSON.parse(body);
      if (req.url.startsWith("/pipeline") || req.url.startsWith("/multi-exec")) {
        return res.end(JSON.stringify(j.map((c) => ({ result: enc(run(c), b64) }))));
      }
      res.end(JSON.stringify({ result: enc(run(j), b64) }));
    } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: e.message })); }
  });

  return {
    server,
    listen: (port = 0) => new Promise((r) => server.listen(port, () => r(`http://localhost:${server.address().port}`))),
    close: () => new Promise((r) => server.close(r)),
  };
}

// Uso directo: node scripts/fake-upstash.mjs  → escucha en el puerto 4567
if (import.meta.url === `file://${process.argv[1]}`) {
  const f = crearFakeUpstash();
  f.listen(4567).then((u) => console.log("Upstash simulado en", u, "(token: tok)"));
}
