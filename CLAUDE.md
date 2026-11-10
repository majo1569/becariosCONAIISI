# Becarios CoNaIISI 2026 — contexto para Claude Code

Página pública (sin login) donde los becarios colaboradores del 14° CoNaIISI (UTN FRRe, 9 al 13 de noviembre de 2026) eligen su nombre, **se anotan en tareas con cupo** y marcan su disponibilidad general. **Lo más importante es que cada cambio quede guardado y no se pierda.**

## Estructura

- `src/`: **fuente de la página** (no editar `public/index.html` a mano: se genera).
  - `app.body.html` (estructura y textos), `app.css` (estilos propios), `app.js` (toda la lógica: vistas Todo · Tareas · Tabla · Cobertura).
  - `marca/`: diseño tipo flyer del congreso (estilo, logo, logos de quienes organizan, onda del pie).
  - `adapter-api.js`: guarda en Vercel vía `/api` (Upstash Redis). `adapter-claude.js`: guarda en la base del artefacto publicado en Claude.
- `npm run build` arma `public/index.html` (Vercel) y `dist/artefacto.html` (para publicar en Claude). **Correrlo después de tocar `src/` o `lib/tareas.js`.**
- `lib/tareas.js`: tareas fijas (rol, día, horario, lugar, `min` = mínimo necesario, `cupo` = máximo, `critico` = imprescindible, `grupo` = para el análisis de cobertura), franjas y roles. Incluye `validarTareaNueva`.
- `lib/db.js`: conexión a Upstash Redis, lectura de personas, inscripciones y tareas (fijas + cargadas desde la página).
- `lib/seed.js`: los 47 becarios iniciales.
- `api/disponibilidad.js`: GET devuelve todo; `?historial=1`, `?formato=csv`, `?formato=tareas`. POST guarda la disponibilidad de una persona.
- `api/inscripcion.js`: POST `{tarea, persona, accion: "anotar"|"baja"}`.
- `api/tarea.js`: POST `{accion: "crear", d, inicio, fin, titulo, min, cupo?, lugar?, detalle?, critico?}` o `{accion: "borrar", id}` (solo tareas cargadas desde la página).
- `scripts/`: `dev.mjs` (servidor local), `fake-upstash.mjs` (simulador), `verificar.mjs` (chequeo del sitio publicado), `build.mjs`.
- `tests/api.test.mjs`: pruebas de persistencia, cupos, superposición y tareas nuevas.

## Datos en Redis (no cambiar el formato: hay datos reales)

- `conaiisi:disponibilidad`: hash, id persona → JSON `{nombre, av, nota, actualizado}`.
- `conaiisi:inscripciones`: hash, `"idTarea#n"` → JSON `{persona, cuando}`. Hay un campo por lugar del cupo y se ocupa con HSETNX (atómico), así que nunca se pasa el cupo.
- `conaiisi:tareas-extra`: hash, id → JSON de las tareas cargadas desde la página (`extra: true`).
- `conaiisi:historial`: lista con cada cambio (`tipo`: disponibilidad, anotar, baja). No se recorta ni se borra.
- `conaiisi:inicializado:<versión>`: marca de que esa versión de la lista inicial ya se cargó. Para sumar personas, se agregan en `lib/seed.js`: al publicar, se insertan solas con HSETNX sin pisar a nadie.
- Sin base conectada, los POST responden 503. Nunca se guarda en memoria en producción.

## Reglas de negocio

- Roles: Tech assistant (al menos 1 por sala en cada sesión, y 1 en cada taller y keynote; llega 30 min antes a preparar las compus), Acreditación (jueves y viernes, separada en keynotes y talleres), Control de inscriptos en la puerta de cada taller, Tour por la facu, Pósters (colgar antes de cada turno y sacar o reemplazar después), Bolsas (lunes desde las 16:30) y Armado y decoración (miércoles antes de la bienvenida de las 21 h).
- Nadie puede anotarse en dos tareas que se superponen. Si una termina 16:00 y la otra empieza 16:00, sí se permite.
- Horarios y salas: Sheet «CONAIISI 2026 Cronograma v3» (Sesión 1 jue 11:30–13:15 salas 1–7; Sesión 2 jue 15:00–16:00 salas 1–4; Sesión 3 jue 16:20–18:05 salas 1–5; Sesión 4 vie 09:00–10:45 salas 1–8; Sesión 5 vie 11:20–12:35 salas 1, 2, 5, 6 y 7). Pósters: Turno 1 jue 11:30–13:15, Turno 2 jue 16:20–18:05, Turno 3 vie 09:00–10:30, en el Hall del Aula Magna y el pasillo.
- **No cambiar el `id` de una tarea que ya tiene gente anotada.** Si se borra una tarea, sus inscripciones quedan en Redis pero ya no se muestran.
- No agregar login. No exponer teléfonos, DNI ni correos.

## Comandos

- `npm run build`: regenerar la página después de cualquier cambio en `src/` o `lib/tareas.js`.

- `npm install`
- `npm test`: correr siempre después de cambiar la API o `lib/tareas.js`.
- `npm run dev`: página en http://localhost:3000
- `npm run verificar -- https://<proyecto>.vercel.app`
