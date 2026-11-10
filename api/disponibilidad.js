// GET  /api/disponibilidad                → { personas, inscripciones, tareas, tipos, dias, franjas, persistente }
// GET  /api/disponibilidad?historial=1    → { historial: [...] } (más nuevo primero)
// GET  /api/disponibilidad?formato=csv    → planilla de disponibilidad
// GET  /api/disponibilidad?formato=tareas → planilla de tareas con quiénes están anotados
// POST /api/disponibilidad                → body { id?, nombre, av, nota }  (crea o actualiza una persona)
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
      const nombre = String(body.nombre || "").trim().slice(0, 80);
      if (nombre.length < 3) return res.status(400).json({ error: "Escribí tu apellido y nombre." });
      const id = body.id ? slug(String(body.id)) : slug(nombre);
      if (!id) return res.status(400).json({ error: "Nombre no válido." });
      await inicializar(redis);
      const prev = await redis.hget(K.personas, id);
      const antes = prev ? parse(prev) : null;
      if (!antes) {
        const total = await redis.hlen(K.personas);
        if (total >= 150) return res.status(400).json({ error: "La lista está completa." });
      }
      // Conserva marcas de franjas que ya no se muestran; actualiza solo las franjas vigentes.
      const av = { ...(antes?.av || {}) };
      for (const k of CLAVES) {
        const v = body.av && body.av[k];
        av[k] = ESTADOS.includes(v) ? v : "u";
      }
      const persona = { nombre: antes?.nombre || nombre, av, nota: String(body.nota || "").trim().slice(0, 300), actualizado: new Date().toISOString() };
      const tx = redis.multi();
      tx.hset(K.personas, { [id]: JSON.stringify(persona) });
      tx.lpush(K.historial, JSON.stringify({ cuando: persona.actualizado, tipo: "disponibilidad", id, nombre: persona.nombre, av, nota: persona.nota, antes: antes ? antes.av : null }));
      await tx.exec();
      return res.status(200).json({ id, persona });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo guardar. Probá de nuevo." });
  }
}
