// Acceso a la base (Upstash Redis). Lo usan las dos funciones de /api.
import { Redis } from "@upstash/redis";
import seed from "./seed.js";
import { TAREAS } from "./tareas.js";

export const K = {
  personas: "conaiisi:disponibilidad",     // hash: id persona → JSON {nombre, av, nota, actualizado}
  inscripciones: "conaiisi:inscripciones", // hash: "idTarea#nLugar" → JSON {persona, cuando}  (un campo por lugar del cupo)
  marcas: "conaiisi:marcas",               // hash: "idPersona|franja" → estado (y/p/q/n/u) y "idPersona|_nota" → aclaración.
                                           // Una celda = un campo: dos personas (o dos celdas) guardando a la vez nunca se pisan.
  tareasExtra: "conaiisi:tareas-extra",    // hash: id tarea → JSON (tareas cargadas desde la página)
  historial: "conaiisi:historial",         // lista: cada cambio (nunca se borra)
  inicializado: "conaiisi:inicializado",   // prefijo de la marca de que la lista inicial (de cada versión) ya se cargó
};

// Vercel agrega KV_REST_API_URL / KV_REST_API_TOKEN al conectar Upstash. También acepta los nombres de Upstash.
// Si al conectar la base en Vercel se eligió otro prefijo (por ejemplo STORAGE_REST_API_URL), también lo encuentra.
function credenciales(env = process.env) {
  let url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  let token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    for (const k of Object.keys(env)) {
      const m = k.match(/^(.*)_(?:REST_API_URL|REDIS_REST_URL)$/);
      if (!m) continue;
      const t = env[`${m[1]}_REST_API_TOKEN`] || env[`${m[1]}_REDIS_REST_TOKEN`];
      if (env[k] && t) { url = env[k]; token = t; break; }
    }
  }
  return { url, token };
}
let _cliente = null, _url = null;
export function cliente() {
  const { url, token } = credenciales();
  if (!url || !token) return null;
  if (_url !== url) { _cliente = new Redis({ url, token }); _url = url; }
  return _cliente;
}

export const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);

// Agrega a la base las personas de la lista inicial (lib/seed.js) que todavía no están.
// Corre una vez por cada versión de la lista (SET NX) y usa HSETNX: nunca pisa a alguien que ya está o ya guardó.
// Cuando se suman personas a seed.js, la versión cambia sola (depende de la cantidad y los ids).
const SEED_VERSION = Object.keys(seed).length + "-" + Object.keys(seed).sort().join(",").length;
let _inicializada = null;
export async function inicializar(redis) {
  if (_inicializada === redis) return; // ya se hizo en esta instancia: ahorra un comando por lectura
  const primera = await redis.set(`${K.inicializado}:${SEED_VERSION}`, new Date().toISOString(), { nx: true });
  if (!primera) { _inicializada = redis; return; }
  const p = redis.pipeline();
  for (const [id, persona] of Object.entries(seed)) p.hsetnx(K.personas, id, JSON.stringify(persona));
  await p.exec();
  _inicializada = redis;
}

// Personas con su disponibilidad: el JSON base de cada una + las celdas guardadas en conaiisi:marcas (que mandan).
export async function leerPersonas(redis) {
  const [data, marcas] = await Promise.all([redis.hgetall(K.personas), redis.hgetall(K.marcas)]);
  const out = {};
  for (const [k, v] of Object.entries(data || {})) { const p = parse(v); out[k] = { ...p, av: { ...(p.av || {}) } }; }
  for (const [campo, v] of Object.entries(marcas || {})) {
    const i = campo.lastIndexOf("|"), id = campo.slice(0, i), k = campo.slice(i + 1);
    if (!out[id]) continue;
    const val = typeof v === "string" ? v : String(v);
    if (k === "_nota") out[id].nota = val; else if (k === "_cuando") out[id].actualizado = val; else out[id].av[k] = val;
  }
  return out;
}

// Devuelve { idTarea: [ {persona, cuando, lugar}, ... ordenado por llegada ] }
export async function leerInscripciones(redis) {
  const data = (await redis.hgetall(K.inscripciones)) || {};
  const out = {};
  for (const [campo, v] of Object.entries(data)) {
    const [tarea, lugar] = campo.split("#");
    const x = parse(v);
    (out[tarea] ||= []).push({ persona: x.persona, cuando: x.cuando, lugar: Number(lugar) });
  }
  for (const l of Object.values(out)) l.sort((a, b) => a.cuando.localeCompare(b.cuando) || a.persona.localeCompare(b.persona));
  return out;
}

export function leerBody(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}

export const sinBase = (res) =>
  res.status(503).json({ error: "La base de datos no está conectada: no se guardó. Avisale a la organización." });

// Tareas fijas (lib/tareas.js) + tareas cargadas desde la página.
export async function leerTareas(redis) {
  if (!redis) return TAREAS;
  const data = (await redis.hgetall(K.tareasExtra)) || {};
  const extra = Object.entries(data).map(([id, v]) => ({ ...parse(v), id }));
  extra.sort((a, b) => (a.creada || "").localeCompare(b.creada || ""));
  return [...TAREAS, ...extra];
}
