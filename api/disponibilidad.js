// GET  /api/disponibilidad                → { personas, inscripciones, tareas, tipos, dias, franjas, persistente }
// GET  /api/disponibilidad?historial=1    → { historial: [...] } (más nuevo primero)
// GET  /api/disponibilidad?formato=csv    → planilla de disponibilidad
// GET  /api/disponibilidad?formato=tareas → planilla de tareas con quiénes están anotados
// POST /api/disponibilidad                → body { id, cambios: { franja: estado } , nota? }  cambia solo esas celdas
//                                            body { nombre }  agrega una persona nueva
//                                            (también acepta { id, nombre, av, nota } de versiones anteriores: cambia solo las franjas enviadas)
import { K, cliente, inicializar, leerPersonas, leerInscripciones, leerTareas, leerBody, parse, sinBase } from "../lib/db.js";
import { TAREAS, TIPOS, DIAS, FRANJAS } from "../lib/tareas.js";
import seed from "../lib/seed.js";

const CLAVES = FRANJAS.map((f) => f.k);
const ESTADOS = ["y", "p", "q", "n", "u"];
const NOMBRE_ESTADO = { y: "Puedo", p: "Una parte", q: "Posiblemente", n: "No puedo", u: "" };
const NOMBRE_DIA = Object.fromEntries(DIAS.map((x) => [x.d, x.nombre]));

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const celda = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = (filas) => "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");

function csvDisponibilidad(personas) {
  const filas = [["Apellido y nombre", ...FRANJAS.map((f) => `${NOMBRE_DIA[f.d]} · ${f.nombre}`), "Aclaración", "Última actualización"]];
  Object.values(personas).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).forEach((p) =>
    filas.push([p.nombre, ...CLAVES.map((k) => NOMBRE_ESTADO[p.av?.[k] || "u"]), p.nota, p.actualizado]));
  return csv(filas);
}

function csvTareas(personas, insc, tareas) {
  const filas = [["Día", "Inicio", "Fin", "Rol", "Tarea", "Lugar", "Imprescindible", "Mínimo", "Máximo", "Anotados", "Faltan para el mínimo", "Personas"]];
  tareas.forEach((t) => {
    const l = insc[t.id] || [];
    filas.push([NOMBRE_DIA[t.d], t.inicio, t.fin, TIPOS[t.tipo]?.nombre || t.tipo, t.titulo, t.lugar, t.critico ? "Sí" : "No", t.min, t.cupo, l.length,
      Math.max(0, t.min - l.length), l.map((x) => personas[x.persona]?.nombre || x.persona).join("; ")]);
  });
  return csv(filas);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const redis = cliente();
    if (req.method === "GET") {
      const q = new URL(req.url, "http://x").searchParams;
      if (q.get("historial")) {
        if (!redis) return res.status(200).json({ historial: [] });
        const limite = Math.min(5000, Math.max(1, parseInt(q.get("limite") || "1000", 10) || 1000));
        const items = await redis.lrange(K.historial, 0, limite - 1);
        return res.status(200).json({ historial: items.map(parse) });
      }
      let personas = seed, inscripciones = {}, tareas = TAREAS;
      if (redis) {
        await inicializar(redis);
        [personas, inscripciones, tareas] = await Promise.all([leerPersonas(redis), leerInscripciones(redis), leerTareas(redis)]);
      }
      const formato = q.get("formato");
      if (formato === "csv" || formato === "tareas") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${formato === "csv" ? "disponibilidad" : "tareas"}-becarios.csv"`);
        return res.status(200).send(formato === "csv" ? csvDisponibilidad(personas) : csvTareas(personas, inscripciones, tareas));
      }
      return res.status(200).json({ personas, inscripciones, tareas, tipos: TIPOS, dias: DIAS, franjas: FRANJAS, persistente: !!redis });
    }

    if (req.method === "POST") {
      if (!redis) return sinBase(res);
      const body = leerBody(req);
      await inicializar(redis);
      const cuando = new Date().toISOString();
      const id = body.id ? slug(String(body.id)) : slug(String(body.nombre || ""));
      if (!id) return res.status(400).json({ error: "Escribí tu apellido y nombre." });
      const existe = await redis.hget(K.personas, id);

      // Persona nueva
      if (!existe) {
        const nombre = String(body.nombre || "").trim().slice(0, 80);
        if (nombre.length < 3) return res.status(400).json({ error: "Escribí tu apellido y nombre." });
        if ((await redis.hlen(K.personas)) >= 150) return res.status(400).json({ error: "La lista está completa." });
        const persona = { nombre, av: Object.fromEntries(CLAVES.map((k) => [k, "u"])), nota: "", actualizado: cuando };
        const creada = await redis.hsetnx(K.personas, id, JSON.stringify(persona)); // si dos la crean a la vez, queda una sola
        if (creada) await redis.lpush(K.historial, JSON.stringify({ cuando, tipo: "alta", id, nombre }));
      }

      // Cambios de celdas: cada celda es un campo propio, así nunca se pisa lo que guardó otro
      const cambios = body.cambios || body.av || {};
      const campos = {}, detalle = {};
      for (const [k, v] of Object.entries(cambios)) {
        if (!CLAVES.includes(k)) continue;
        const val = ESTADOS.includes(v) ? v : "u";
        campos[`${id}|${k}`] = val; detalle[k] = val;
      }
      if (typeof body.nota === "string") campos[`${id}|_nota`] = body.nota.trim().slice(0, 300);
      if (Object.keys(campos).length) {
        const antes = await redis.hmget(K.marcas, ...Object.keys(campos));
        const base = existe ? parse(existe) : null;
        const previo = {};
        Object.keys(detalle).forEach((k, i) => { previo[k] = (Array.isArray(antes) ? antes[i] : antes?.[`${id}|${k}`]) ?? base?.av?.[k] ?? "u"; });
        campos[`${id}|_cuando`] = cuando;
        const tx = redis.multi();
        tx.hset(K.marcas, campos);
        tx.lpush(K.historial, JSON.stringify({ cuando, tipo: "disponibilidad", id, cambios: detalle, antes: previo, ...(typeof body.nota === "string" ? { nota: campos[`${id}|_nota`] } : {}) }));
        await tx.exec();
      }
      const personas = await leerPersonas(redis);
      return res.status(200).json({ id, persona: personas[id] });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo guardar. Probá de nuevo." });
  }
}
