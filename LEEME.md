# Becarios CoNaIISI 2026 — disponibilidad

Página para que cada colaborador elija su nombre, se anote en tareas con cupo (tech assistant, acreditación, control de inscriptos, tour, pósters, bolsas y armado de la bienvenida) y marque su disponibilidad, sin login. Cada cambio queda guardado en una base de datos (Upstash Redis) y además se anota en un historial que no se borra.

## 1. Abrir y probar en tu compu

Necesitás Node 22 o más nuevo (`node --version`).

```
npm install
npm test          # 23 pruebas de guardado, cupos, superposición y tareas nuevas: tienen que dar todas "ok"
npm run build     # arma public/index.html (Vercel) y dist/artefacto.html (Claude) desde src/
npm run dev       # abre la página en http://localhost:3000 con una base simulada
```

## 2. Crear la base de datos y publicar en Vercel

1. Subí la carpeta a un repositorio de GitHub. Desde VS Code: *Source Control → Publish to GitHub*. El `.gitignore` ya deja afuera `node_modules` y `.env.local`.
2. En vercel.com tocá **Add New → Project**, elegí el repositorio y tocá **Deploy**. En Framework dejá **Other**.
3. En el proyecto andá a **Storage → Create Database → Upstash for Redis**, elegí el plan gratuito y la región más cercana (São Paulo, si aparece). Conectala al proyecto. Vercel agrega solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
4. Andá a **Deployments**, abrí el menú (⋯) del último deploy y tocá **Redeploy**.

Opcional: para que `npm run dev` use la base real, copiá `.env.local.example` a `.env.local` y pegá ahí las dos variables. Las encontrás en Vercel → Settings → Environment Variables, o en el panel de Upstash.

## 3. Comprobar el sitio publicado

```
npm run verificar -- https://tu-proyecto.vercel.app
```

Tiene que decir «Todo bien». Este chequeo solo lee, no modifica nada. Después marcá algo en tu nombre, recargá la página y fijate que siga ahí.

## Ver y descargar los datos

- Tareas con quiénes están anotados y cuántos faltan: `https://tu-proyecto.vercel.app/api/disponibilidad?formato=tareas`
- Disponibilidad de cada uno: `https://tu-proyecto.vercel.app/api/disponibilidad?formato=csv`
- Para cambiar cupos, mínimos u horarios de las tareas fijas: editá `lib/tareas.js` (o pedíselo a Claude Code), corré `npm test` y `npm run build`, y hacé push. Las tareas puntuales también se pueden cargar desde la misma página con «Cargar una tarea nueva».
- Historial de cambios: `https://tu-proyecto.vercel.app/api/disponibilidad?historial=1`. Muestra quién cambió qué, cuándo y qué tenía antes.
- Panel de Upstash → Data Browser: ahí ves las claves `conaiisi:disponibilidad` y `conaiisi:historial`. Upstash también permite hacer copias de seguridad.

## Para tener en cuenta

- Cualquiera que tenga el link puede marcar en cualquier nombre. Si alguien pisa una fila por error, la recuperás desde el historial.
- Si la base no está conectada, la página lo avisa arriba y no deja guardar.
- Si una persona tiene cambios sin guardar e intenta cerrar la pestaña, el navegador le avisa.
- Para editar el proyecto con Claude Code, el archivo `CLAUDE.md` explica cómo está armado.
