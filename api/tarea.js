// POST /api/tarea  body { accion: "crear", d, inicio, fin, titulo, lugar?, detalle?, min, cupo?, critico? }
//                  body { accion: "borrar", id }   (solo tareas cargadas desde la página)
import { K, cliente, leerInscripciones, leerTareas, leerBody, sinBase } from "../lib/db.js";
import { validarTareaNueva } from "../lib/tareas.js";

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Método no permitido" }); }
  try {
    const redis = cliente();
    if (!redis) return sinBase(res);
    const body = leerBody(req);
    const cuando = new Date().toISOString();

    if (body.accion === "crear") {
      const { tarea, error } = validarTareaNueva(body);
      if (error) return res.status(400).json({ error });
      const extra = (await leerTareas(redis)).filter((t) => t.extra);
      if (extra.length >= 60) return res.status(400).json({ error: "Ya hay demasiadas tareas agregadas." });
      const id = `extra-${tarea.d}-${tarea.inicio.replace(":", "")}-${slug(tarea.titulo)}-${Math.random().toString(36).slice(2, 6)}`;
      tarea.creada = cuando;
      const tx = redis.multi();
      tx.hset(K.tareasExtra, { [id]: JSON.stringify(tarea) });
      tx.lpush(K.historial, JSON.stringify({ cuando, tipo: "tarea-nueva", tarea: id, titulo: tarea.titulo }));
      await tx.exec();
      return res.status(200).json({ ok: true, tarea: { ...tarea, id } });
    }

    if (body.accion === "borrar") {
      const tareas = await leerTareas(redis);
      const t = tareas.find((x) => x.id === body.id);
      if (!t || !t.extra) return res.status(400).json({ error: "Solo se pueden borrar tareas agregadas desde la página." });
      const insc = (await leerInscripciones(redis))[t.id] || [];
      const tx = redis.multi();
      tx.hdel(K.tareasExtra, t.id);
      insc.forEach((x) => tx.hdel(K.inscripciones, `${t.id}#${x.lugar}`));
      tx.lpush(K.historial, JSON.stringify({ cuando, tipo: "tarea-borrada", tarea: t.id, titulo: t.titulo, tenia: insc.map((x) => x.persona) }));
      await tx.exec();
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "Acción no válida." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo guardar. Probá de nuevo." });
  }
}
