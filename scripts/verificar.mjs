// Chequea el sitio publicado: npm run verificar -- https://tu-proyecto.vercel.app
// Solo lee: no modifica ningún dato.
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base.startsWith("http")) {
  console.error("Uso: npm run verificar -- https://tu-proyecto.vercel.app");
  process.exit(1);
}
let ok = true;
const check = (cond, msg) => { console.log((cond ? "✔ " : "✘ ") + msg); if (!cond) ok = false; };

try {
  const r = await fetch(base + "/api/disponibilidad", { cache: "no-store" });
  check(r.ok, `La API responde (${r.status})`);
  const j = await r.json();
  check(j.persistente === true, "La base de datos está conectada" + (j.persistente ? "" : " → falta conectar Upstash en Storage y hacer Redeploy"));
  const n = Object.keys(j.personas || {}).length;
  check(n > 0, `Hay ${n} personas en la lista`);
  const tareas = j.tareas || [];
  const lugares = tareas.reduce((s, t) => s + t.cupo, 0);
  const cubiertos = tareas.reduce((s, t) => s + Math.min(t.cupo, (j.inscripciones?.[t.id] || []).length), 0);
  check(tareas.length > 0, `Hay ${tareas.length} tareas (${cubiertos}/${lugares} lugares cubiertos)`);

  const h = await fetch(base + "/api/disponibilidad?historial=1&limite=5", { cache: "no-store" });
  const hj = await h.json();
  check(h.ok && Array.isArray(hj.historial), `El historial responde (${(hj.historial || []).length} cambios recientes)`);
  for (const e of hj.historial || []) console.log(`   ${e.cuando}  ${e.tipo || ""}  ${e.nombre || e.id}${e.titulo ? "  · " + e.titulo : ""}`);

  const csv = await fetch(base + "/api/disponibilidad?formato=csv", { cache: "no-store" });
  check(csv.ok, "La descarga de disponibilidad en CSV funciona");
  const csvT = await fetch(base + "/api/disponibilidad?formato=tareas", { cache: "no-store" });
  check(csvT.ok, "La descarga de tareas en CSV funciona");

  const p = await fetch(base + "/", { cache: "no-store" });
  check(p.ok && (await p.text()).includes("Becarios colaboradores"), "La página carga");
} catch (e) {
  check(false, "No se pudo conectar: " + e.message);
}
console.log(ok ? "\nTodo bien." : "\nHay problemas: revisá los puntos marcados con ✘.");
process.exit(ok ? 0 : 1);
