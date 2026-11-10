// Arma las dos versiones de la página a partir de src/:
//   public/index.html   → para Vercel (usa /api)
//   dist/artefacto.html → para la página publicada en Claude (usa la base del artefacto)
// Uso: npm run build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TAREAS, TIPOS, DIAS, FRANJAS } from "../lib/tareas.js";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = (p) => fs.readFileSync(path.join(raiz, p), "utf8");

const css = leer("src/marca/estilo.css") + "\n" + leer("src/app.css");
const body = leer("src/app.body.html")
  .replace("{{CABECERA}}", leer("src/marca/cabecera.html"))
  .replace("{{PIE}}", leer("src/marca/pie.html"))
  .replace("{{ONDA}}", leer("src/marca/onda.html"));
const app = leer("src/app.js");
const titulo = "<title>Becarios CoNaIISI 2026</title>";
const fuentes = leer("src/marca/fuentes.html").trim();

// Vercel: documento completo
const vercel = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${titulo}
${fuentes}
<style>
:root{color-scheme:light}*,*::before,*::after{box-sizing:border-box}html,body{margin:0}img{max-width:100%}
${css}</style>
</head>
<body>
${body}
<script>
${leer("src/adapter-api.js")}
${app}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(raiz, "public/index.html"), vercel);

// Claude: contenido de página (el visor agrega el esqueleto)
const config = JSON.stringify({ tareas: TAREAS, tipos: TIPOS, dias: DIAS, franjas: FRANJAS });
const artefacto = `${titulo}
<meta name="claude:viewport-fit-sides" content="cover">
${fuentes}
<style>
${css}</style>
${body}
<script>
${leer("src/adapter-claude.js").replace("/*CONFIG*/null", config)}
${app}
</script>
`;
fs.mkdirSync(path.join(raiz, "dist"), { recursive: true });
fs.writeFileSync(path.join(raiz, "dist/artefacto.html"), artefacto);
console.log("Listo: public/index.html y dist/artefacto.html");
