// POST /api/inscripcion  body { tarea, persona, accion: "anotar" | "baja" }
// Anota o da de baja a una persona en una tarea.
// Cada tarea tiene tantos lugares como su cupo; cada lugar es un campo "idTarea#n" que se ocupa con HSETNX,
// que es atómico: dos personas nunca pueden quedarse con el mismo lugar y nunca se pasa el cupo.
import { K, cliente, inicializar, leerInscripciones, leerTareas, leerBody, sinBase } from "../lib/db.js";
import { seSuperponen } from "../lib/tareas.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Método no permitido" }); }
  try {
    const redis = cliente();
    if (!redis) return sinBase(res);
    const { tarea: idTarea, persona, accion } = leerBody(req);
    const TAREAS = await leerTareas(redis);
    const tarea = TAREAS.find((t) => t.id === idTarea);
    if (!tarea) return res.status(400).json({ error: "Esa tarea no existe." });
    if (!persona || typeof persona !== "string") return res.status(400).json({ error: "Elegí tu nombre primero." });
    await inicializar(redis);
    if (!(await redis.hexists(K.personas, persona))) return res.status(400).json({ error: "No encontramos tu nombre en la lista." });

    let insc = await leerInscripciones(redis);
    const mio = (insc[tarea.id] || []).find((x) => x.persona === persona);
    const cuando = new Date().toISOString();

    if (accion === "baja") {
      if (mio) {
        const tx = redis.multi();
        tx.hdel(K.inscripciones, `${tarea.id}#${mio.lugar}`);
        tx.lpush(K.historial, JSON.stringify({ cuando, tipo: "baja", tarea: tarea.id, titulo: tarea.titulo, id: persona }));
        await tx.exec();
      }
      return res.status(200).json({ ok: true, inscripciones: await leerInscripciones(redis) });
    }
    if (accion !== "anotar") return res.status(400).json({ error: "Acción no válida." });
    if (mio) return res.status(200).json({ ok: true, inscripciones: insc });

    const choque = TAREAS.find((t) => t.id !== tarea.id && seSuperponen(t, tarea) && (insc[t.id] || []).some((x) => x.persona === persona));
    if (choque) return res.status(409).json({ error: `Ya estás en «${choque.titulo}» (${choque.inicio}–${choque.fin}), que se superpone con este horario.`, inscripciones: insc });

    const ocupados = new Set((insc[tarea.id] || []).map((x) => x.lugar));
    const valor = JSON.stringify({ persona, cuando });
    let lugar = -1;
    for (let n = 0; n < tarea.cupo && lugar < 0; n++) {
      if (ocupados.has(n)) continue;
      if (await redis.hsetnx(K.inscripciones, `${tarea.id}#${n}`, valor)) lugar = n;
    }
    if (lugar < 0) return res.status(409).json({ error: "Esta tarea ya tiene el cupo completo.", inscripciones: await leerInscripciones(redis) });
    await redis.lpush(K.historial, JSON.stringify({ cuando, tipo: "anotar", tarea: tarea.id, titulo: tarea.titulo, id: persona }));
    return res.status(200).json({ ok: true, inscripciones: await leerInscripciones(redis) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "No se pudo guardar. Probá de nuevo." });
  }
}
