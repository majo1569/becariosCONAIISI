// Pruebas de persistencia: npm test
// Cada prueba usa una base Upstash simulada nueva y llama a la API igual que lo hace Vercel.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { crearFakeUpstash } from "../scripts/fake-upstash.mjs";
import disponibilidad from "../api/disponibilidad.js";
import inscripcion from "../api/inscripcion.js";
import apiTarea from "../api/tarea.js";
import seed from "../lib/seed.js";
import { TAREAS, seSuperponen } from "../lib/tareas.js";

let fake;
beforeEach(async () => {
  fake = crearFakeUpstash();
  process.env.KV_REST_API_URL = await fake.listen(0);
  process.env.KV_REST_API_TOKEN = "tok";
  delete process.env.VERCEL;
});
afterEach(async () => { await fake.close(); });

function llamar(handler, method, url, body) {
  return new Promise((resolve) => {
    const res = {
      headers: {}, code: 200,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, body: o, headers: this.headers }); },
      send(t) { resolve({ code: this.code, body: t, headers: this.headers }); },
    };
    handler({ method, url, body: body ?? undefined }, res);
  });
}
const get = (q = "") => llamar(disponibilidad, "GET", "/api/disponibilidad" + q);
const post = (b) => llamar(disponibilidad, "POST", "/api/disponibilidad", b);
const anotar = (tarea, persona) => llamar(inscripcion, "POST", "/api/inscripcion", { tarea, persona, accion: "anotar" });
const baja = (tarea, persona) => llamar(inscripcion, "POST", "/api/inscripcion", { tarea, persona, accion: "baja" });
const ids = Object.keys(seed);

// ---------- Disponibilidad ----------

test("la primera lectura carga la lista inicial, las tareas y avisa que la base está conectada", async () => {
  const r = await get();
  assert.equal(r.code, 200);
  assert.equal(r.body.persistente, true);
  assert.equal(Object.keys(r.body.personas).length, ids.length);
  assert.equal(r.body.tareas.length, TAREAS.length);
  assert.deepEqual(r.body.inscripciones, {});
});

test("un cambio de disponibilidad se lee después, también desde otra instancia", async () => {
  await get();
  const g = await post({ id: "castro-mauricio", nombre: "Castro, Mauricio", av: { "l-t": "y", "v-m": "p" }, nota: "lunes puedo" });
  assert.equal(g.code, 200);
  const { default: otra } = await import("../api/disponibilidad.js?otra=" + Date.now());
  const r = await llamar(otra, "GET", "/api/disponibilidad");
  const p = r.body.personas["castro-mauricio"];
  assert.equal(p.av["l-t"], "y");
  assert.equal(p.av["v-m"], "p");
  assert.equal(p.nota, "lunes puedo");
});

test("guardados simultáneos de distintas personas no se pisan", async () => {
  await get();
  const varios = ids.slice(0, 20);
  const res = await Promise.all(varios.map((id) => post({ id, nombre: seed[id].nombre, av: { "j-t": "y" }, nota: "ok " + id })));
  res.forEach((r) => assert.equal(r.code, 200));
  const { body } = await get();
  for (const id of varios) {
    assert.equal(body.personas[id].av["j-t"], "y", id);
    assert.equal(body.personas[id].nota, "ok " + id);
  }
});

test("cada cambio de disponibilidad queda en el historial con lo que había antes", async () => {
  await get();
  await post({ id: "sanz-victoria", cambios: { "l-t": "y" } });
  await post({ id: "sanz-victoria", cambios: { "l-t": "n" } });
  const { body } = await get("?historial=1");
  assert.equal(body.historial.length, 2);
  assert.equal(body.historial[0].cambios["l-t"], "n");
  assert.equal(body.historial[0].antes["l-t"], "y");
  assert.equal(body.historial[1].antes["l-t"], "u");
  assert.ok(body.historial[0].cuando);
});

// ---------- Simultaneidad: lo más importante ----------

test("la misma persona marca varias celdas a la vez (desde distintos celulares): no se pierde ninguna", async () => {
  await get();
  const valores = { "l-t": "y", "w-m": "p", "w-n": "q", "j-m": "n", "j-t": "y", "j-n": "p", "v-m": "q" };
  const res = await Promise.all(Object.entries(valores).map(([k, v]) => post({ id: "cettour-ivo", cambios: { [k]: v } })));
  res.forEach((r) => assert.equal(r.code, 200));
  const { body } = await get();
  for (const [k, v] of Object.entries(valores)) assert.equal(body.personas["cettour-ivo"].av[k], v, k);
});

test("todos marcan todo al mismo tiempo: cada celda de cada persona queda guardada", async () => {
  await get();
  const est = ["y", "p", "q", "n"];
  const claves = (await get()).body.franjas.map((f) => f.k);
  const esperado = {};
  const pedidos = [];
  ids.forEach((id, i) => claves.forEach((k, j) => {
    const v = est[(i + j) % 4];
    (esperado[id] ||= {})[k] = v;
    pedidos.push(post({ id, cambios: { [k]: v } }));
  }));
  const res = await Promise.all(pedidos);
  assert.equal(res.filter((r) => r.code !== 200).length, 0);
  const { body } = await get();
  for (const id of ids) for (const k of claves) assert.equal(body.personas[id].av[k], esperado[id][k], `${id} ${k}`);
  // y también quedó en el historial cada uno de esos cambios
  const h = await get("?historial=1&limite=5000");
  assert.equal(h.body.historial.filter((x) => x.tipo === "disponibilidad").length, pedidos.length);
});

test("dos personas se agregan con el mismo nombre a la vez: queda una sola", async () => {
  await get();
  const r = await Promise.all([post({ nombre: "Pérez, Lucía" }), post({ nombre: "Pérez, Lucía" }), post({ nombre: "Perez, Lucia" })]);
  r.forEach((x) => assert.equal(x.code, 200));
  const { body } = await get();
  assert.equal(Object.keys(body.personas).filter((k) => k === "perez-lucia").length, 1);
  assert.equal(Object.keys(body.personas).length, ids.length + 1);
});

test("marcar disponibilidad y anotarse en tareas al mismo tiempo no se mezclan", async () => {
  await get();
  const varios = ids.slice(0, 15);
  await Promise.all(varios.flatMap((id, i) => [
    post({ id, cambios: { "j-m": "y" } }),
    anotar(["tour-jue-1", "tour-jue-2", "bolsas-lun"][i % 3], id),
  ]));
  const { body } = await get();
  varios.forEach((id) => assert.equal(body.personas[id].av["j-m"], "y"));
  const total = ["tour-jue-1", "tour-jue-2", "bolsas-lun"].reduce((s, t) => s + (body.inscripciones[t] || []).length, 0);
  assert.equal(total, 2 + 2 + 5); // tours con cupo 2 cada uno; bolsas: los 5 que lo pidieron (cupo 8)
});

test("alguien nuevo puede sumarse y queda guardado", async () => {
  await get();
  const r = await post({ nombre: "Pérez, Lucía", av: { "j-m": "y" } });
  assert.equal(r.code, 200);
  assert.equal(r.body.id, "perez-lucia");
  const { body } = await get();
  assert.equal(body.personas["perez-lucia"].nombre, "Pérez, Lucía");
});

test("la lista inicial nunca pisa lo que alguien ya guardó", async () => {
  await post({ id: "castro-mauricio", nombre: "Castro, Mauricio", av: { "j-m": "q" } });
  await get(); await get();
  const { body } = await get();
  assert.equal(body.personas["castro-mauricio"].av["j-m"], "q");
  assert.equal(Object.keys(body.personas).length, ids.length);
});

test("valores inválidos se guardan como 'sin marcar' y el nombre original se respeta", async () => {
  await get();
  await post({ id: "castro-mauricio", nombre: "Otro nombre", av: { "j-m": "<script>", zz: "y" } });
  const { body } = await get();
  const p = body.personas["castro-mauricio"];
  assert.equal(p.nombre, "Castro, Mauricio");
  assert.equal(p.av["j-m"], "u");
  assert.equal(p.av.zz, undefined);
});

test("si se suman personas a la lista inicial, aparecen sin pisar lo ya guardado", async () => {
  // Simula una base que ya estaba en uso con una lista inicial vieja (sin los nuevos)
  const { cliente, K } = await import("../lib/db.js");
  const redis = cliente();
  await redis.set(K.inicializado + ":vieja", "x");
  const viejos = ids.slice(0, 5);
  for (const id of viejos) await redis.hset(K.personas, { [id]: JSON.stringify({ ...seed[id], nota: "ya guardado" }) });
  const { body } = await get();
  assert.equal(Object.keys(body.personas).length, ids.length);
  for (const id of viejos) assert.equal(body.personas[id].nota, "ya guardado");
  assert.ok(body.personas["balbuena-yusva-mario"]);
});

// ---------- Tareas ----------

test("anotarse en una tarea queda guardado y se ve desde otra instancia", async () => {
  await get();
  const r = await anotar("tech-s1-sala1", "castro-mauricio");
  assert.equal(r.code, 200);
  const { default: otra } = await import("../api/disponibilidad.js?otra2=" + Date.now());
  const g = await llamar(otra, "GET", "/api/disponibilidad");
  assert.deepEqual(g.body.inscripciones["tech-s1-sala1"].map((x) => x.persona), ["castro-mauricio"]);
});

test("darse de baja libera el lugar", async () => {
  await get();
  await anotar("tech-s1-sala1", "castro-mauricio");
  const r = await baja("tech-s1-sala1", "castro-mauricio");
  assert.equal(r.code, 200);
  const { body } = await get();
  assert.equal((body.inscripciones["tech-s1-sala1"] || []).length, 0);
});

test("no deja pasar el cupo", async () => {
  await get();
  const t = TAREAS.find((x) => x.id === "acred-jue-keynotes"); // cupo 3
  for (const id of ids.slice(0, t.cupo)) assert.equal((await anotar(t.id, id)).code, 200);
  const r = await anotar(t.id, ids[t.cupo]);
  assert.equal(r.code, 409);
  const { body } = await get();
  assert.equal(body.inscripciones[t.id].length, t.cupo);
});

test("muchas personas a la vez por el mismo lugar: nunca queda más gente que el cupo", async () => {
  await get();
  const t = TAREAS.find((x) => x.id === "tech-s4-sala8"); // cupo 1
  const res = await Promise.all(ids.slice(0, 10).map((id) => anotar(t.id, id)));
  const { body } = await get();
  assert.equal(body.inscripciones[t.id].length, 1);
  assert.equal(res.filter((r) => r.code === 200).length >= 1, true);
});

test("no deja anotarse en dos tareas que se superponen", async () => {
  await get();
  const a = TAREAS.find((x) => x.id === "tech-s1-sala1");
  const b = TAREAS.find((x) => x.id === "tech-s1-sala2");
  assert.ok(seSuperponen(a, b));
  assert.equal((await anotar(a.id, "castro-mauricio")).code, 200);
  const r = await anotar(b.id, "castro-mauricio");
  assert.equal(r.code, 409);
  assert.match(r.body.error, /superpone/);
  // Una tarea que empieza justo cuando termina la otra sí se permite (S2 termina 16:00, S3 prepara 16:00)
  assert.equal((await anotar("tech-s2-sala1", "sanz-victoria")).code, 200);
  assert.equal((await anotar("tech-s3-sala1", "sanz-victoria")).code, 200);
});

test("anotarse dos veces en la misma tarea no duplica", async () => {
  await get();
  await anotar("tour-jue-1", "castro-mauricio");
  await anotar("tour-jue-1", "castro-mauricio");
  const { body } = await get();
  assert.equal(body.inscripciones["tour-jue-1"].length, 1);
});

test("rechaza tareas o personas que no existen", async () => {
  await get();
  assert.equal((await anotar("no-existe", "castro-mauricio")).code, 400);
  assert.equal((await anotar("tour-jue-1", "nadie-nadie")).code, 400);
});

test("anotarse y darse de baja queda en el historial", async () => {
  await get();
  await anotar("tour-vie-1", "castro-mauricio");
  await baja("tour-vie-1", "castro-mauricio");
  const { body } = await get("?historial=1");
  assert.deepEqual(body.historial.map((x) => x.tipo), ["baja", "anotar"]);
  assert.equal(body.historial[1].tarea, "tour-vie-1");
});

// ---------- Tareas nuevas ----------

const crearTarea = (b) => llamar(apiTarea, "POST", "/api/tarea", { accion: "crear", ...b });

test("se puede cargar una tarea nueva, anotarse y queda guardada", async () => {
  await get();
  const r = await crearTarea({ titulo: "Llevar sillas al hall", d: "j", inicio: "07:30", fin: "08:00", min: 2, cupo: 3, lugar: "Hall" });
  assert.equal(r.code, 200);
  const id = r.body.tarea.id;
  assert.equal((await anotar(id, "castro-mauricio")).code, 200);
  const { body } = await get();
  const t = body.tareas.find((x) => x.id === id);
  assert.equal(t.min, 2); assert.equal(t.cupo, 3); assert.equal(t.extra, true);
  assert.equal(body.inscripciones[id][0].persona, "castro-mauricio");
  const csv = await get("?formato=tareas");
  assert.ok(csv.body.includes("Llevar sillas al hall"));
});

test("una tarea nueva respeta superposición y cupo", async () => {
  await get();
  const id = (await crearTarea({ titulo: "Apoyo extra", d: "j", inicio: "11:00", fin: "12:00", min: 1, cupo: 1 })).body.tarea.id;
  await anotar("tech-s1-sala1", "castro-mauricio");
  assert.equal((await anotar(id, "castro-mauricio")).code, 409);
  assert.equal((await anotar(id, "sanz-victoria")).code, 200);
  assert.equal((await anotar(id, ids[0])).code, 409);
});

test("rechaza tareas nuevas inválidas", async () => {
  await get();
  assert.equal((await crearTarea({ titulo: "", d: "j", inicio: "10:00", fin: "11:00", min: 1 })).code, 400);
  assert.equal((await crearTarea({ titulo: "Algo", d: "x", inicio: "10:00", fin: "11:00", min: 1 })).code, 400);
  assert.equal((await crearTarea({ titulo: "Algo", d: "j", inicio: "11:00", fin: "10:00", min: 1 })).code, 400);
  assert.equal((await crearTarea({ titulo: "Algo", d: "j", inicio: "10:00", fin: "11:00", min: 0 })).code, 400);
  assert.equal((await crearTarea({ titulo: "Algo", d: "j", inicio: "10:00", fin: "11:00", min: 3, cupo: 2 })).code, 400);
});

test("borrar una tarea nueva saca también sus anotados; las fijas no se pueden borrar", async () => {
  await get();
  const id = (await crearTarea({ titulo: "Temporal", d: "v", inicio: "15:00", fin: "16:00", min: 1 })).body.tarea.id;
  await anotar(id, "castro-mauricio");
  assert.equal((await llamar(apiTarea, "POST", "/api/tarea", { accion: "borrar", id })).code, 200);
  const { body } = await get();
  assert.equal(body.tareas.some((x) => x.id === id), false);
  assert.equal((body.inscripciones[id] || []).length, 0);
  assert.equal((await llamar(apiTarea, "POST", "/api/tarea", { accion: "borrar", id: "tech-s1-sala1" })).code, 400);
});

// ---------- Fallas y exportación ----------

test("sin base conectada no guarda y lo dice", async () => {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  assert.equal((await post({ id: "castro-mauricio", nombre: "Castro, Mauricio", av: {} })).code, 503);
  assert.equal((await anotar("tour-jue-1", "castro-mauricio")).code, 503);
  assert.equal((await get()).body.persistente, false);
});

test("encuentra la base aunque Vercel use otro prefijo en las variables", async () => {
  const url = process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  process.env.STORAGE_REST_API_URL = url; process.env.STORAGE_REST_API_TOKEN = "tok";
  try {
    assert.equal((await get()).body.persistente, true);
    assert.equal((await post({ id: "castro-mauricio", cambios: { "j-m": "n" } })).code, 200);
  } finally { delete process.env.STORAGE_REST_API_URL; delete process.env.STORAGE_REST_API_TOKEN; }
});

test("si la base falla, responde error (no hace como que guardó)", async () => {
  process.env.KV_REST_API_TOKEN = "token-incorrecto";
  assert.equal((await post({ id: "castro-mauricio", nombre: "Castro, Mauricio", av: {} })).code, 500);
  assert.equal((await anotar("tour-jue-1", "castro-mauricio")).code, 500);
});

test("las descargas CSV incluyen a todos y las tareas con sus anotados", async () => {
  await get();
  await post({ id: "castro-mauricio", nombre: "Castro, Mauricio", av: { "l-t": "y" } });
  await anotar("bolsas-lun", "castro-mauricio");
  const d = await get("?formato=csv");
  assert.match(d.headers["content-type"], /text\/csv/);
  assert.equal(d.body.trim().split("\r\n").length, ids.length + 1);
  assert.ok(d.body.includes('"Castro, Mauricio","Puedo"'));
  const t = await get("?formato=tareas");
  assert.equal(t.body.trim().split("\r\n").length, TAREAS.length + 1);
  assert.ok(t.body.includes('"Castro, Mauricio"'));
});
