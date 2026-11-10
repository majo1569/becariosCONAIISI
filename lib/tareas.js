// Tareas de los becarios colaboradores — 14° CoNaIISI 2026.
// Fuente de horarios: Sheet «CONAIISI 2026 Cronograma v3», programa web y turnos de pósters.
// Para cambiar un cupo, un horario o agregar una tarea, se edita solo este archivo.
// IMPORTANTE: no cambiar el `id` de una tarea que ya tiene gente anotada (las inscripciones se guardan por id).

export const DIAS = [
  { d: "l", nombre: "Lunes 9" },
  { d: "w", nombre: "Miércoles 11" },
  { d: "j", nombre: "Jueves 12" },
  { d: "v", nombre: "Viernes 13" },
];

export const TIPOS = {
  tech:   { nombre: "Tech assistant", desc: "Llega antes para preparar la compu, el proyector y el audio, carga las presentaciones y se queda durante toda la actividad para resolver problemas técnicos y lo que necesiten el moderador o los expositores." },
  acred:  { nombre: "Acreditación", desc: "Atiende la mesa de acreditación. Hay dos filas: una para keynotes (conferencias) y otra para talleres." },
  puerta: { nombre: "Control de inscriptos", desc: "Está en la puerta del taller y revisa que cada persona esté inscripta antes de entrar." },
  tour:   { nombre: "Tour por la facu", desc: "Recorre la facultad para orientar a los participantes, responder dudas y ayudar en lo que haga falta." },
  poster: { nombre: "Pósters", desc: "Cuelga los pósters antes de cada turno y saca o reemplaza los del turno anterior. Hall del Aula Magna y pasillo." },
  bolsas: { nombre: "Bolsas de regalo", desc: "Arma las bolsas de regalo para los asistentes." },
  otra:   { nombre: "Otra tarea", desc: "Tareas que agrega la organización durante la semana." },
  armado: { nombre: "Armado y decoración", desc: "Prepara todo antes del congreso: pega carteles y señalética, arma las hojas de los moderadores, acomoda el lugar y coloca la decoración para la bienvenida." },
};

const SALAS_JUE = {
  1: "Sala 1 · IA y Sistemas Inteligentes (Aula 2.1)",
  2: "Sala 2 · Educación en Ingeniería (Aula 2.5)",
  3: "Sala 3 · Ingeniería de Software (Aula 1.1)",
  4: "Sala 4 · Ciberseguridad e Informática Forense (Aula 1.2)",
  5: "Sala 5 · Track Estudiantes (Aula 1.3)",
  6: "Sala 6 · Sist. de Computación y Com. de Datos (Aula 1.5)",
  7: "Sala 7 · Track Estudiantes, extracátedra (Aula 2.9)",
};
const SALAS_VIE = {
  1: "Sala 1 · IA y Sistemas Inteligentes (Aula 2.1)",
  2: "Sala 2 · Educación en Ingeniería (Aula 2.5)",
  3: "Sala 3 · Gestión de Proyectos (Aula 1.1)",
  4: "Sala 4 · Ingeniería de Software (Aula 1.2)",
  5: "Sala 5 · Bases de Datos y Ciencia de Datos (Aula 1.3)",
  6: "Sala 6 · IA y Sistemas Inteligentes (Aula 1.5)",
  7: "Sala 7 · Educación en Ingeniería (Aula 2.9)",
  8: "Sala 8 · Track Estudiantes, TFC (Aula 2.11)",
};

// Sesiones de ponencias. `prep` = hora de llegada del tech assistant (antes de que empiece).
const SESIONES = [
  { n: 1, d: "j", prep: "11:00", inicio: "11:30", fin: "13:15", salas: [1, 2, 3, 4, 5, 6, 7], nombres: SALAS_JUE },
  { n: 2, d: "j", prep: "14:30", inicio: "15:00", fin: "16:00", salas: [1, 2, 3, 4], nombres: SALAS_JUE },
  { n: 3, d: "j", prep: "16:00", inicio: "16:20", fin: "18:05", salas: [1, 2, 3, 4, 5], nombres: SALAS_JUE },
  { n: 4, d: "v", prep: "08:30", inicio: "09:00", fin: "10:45", salas: [1, 2, 3, 4, 5, 6, 7, 8], nombres: SALAS_VIE },
  { n: 5, d: "v", prep: "10:50", inicio: "11:20", fin: "12:35", salas: [1, 2, 5, 6, 7], nombres: SALAS_VIE },
];

const TALLERES = [
  { id: "inclusivas", d: "j", prep: "11:00", inicio: "11:30", fin: "12:30", nombre: "Taller: Creando experiencias digitales inclusivas en tiempos de IA", lugar: "Aula 2.2", quien: "Dra. Noelia Pinto y Lic. Gabriela Mariño" },
  { id: "prompt", d: "j", prep: "14:30", inicio: "15:00", fin: "17:00", nombre: "Taller: Más allá del Prompt", lugar: "Laboratorio (a confirmar)", quien: "Paula Florencia Herrera" },
  { id: "aidlc", d: "v", prep: "09:30", inicio: "10:00", fin: "11:30", nombre: "Workshop AI-DLC: el nuevo ciclo de vida del desarrollo en la era de la IA", lugar: "A confirmar", quien: "Ing. Valentina Sosa · cupo 30" },
  { id: "adestudiantes", d: "v", prep: "09:30", inicio: "10:00", fin: "11:30", nombre: "Workshop ADEstudiantes: Construyendo Comunidad", lugar: "Aula 2.2", quien: "Equipo Giesin, CInApTIC · cupo 40" },
];

const KEYNOTES = [
  { id: "apertura", d: "j", prep: "08:30", inicio: "09:00", fin: "11:00", nombre: "Acto de apertura (09:00) y keynote «Software que construye software» (10:00)", lugar: "Aula Magna", quien: "Dr. Mariano Minoli" },
  { id: "cierre", d: "v", prep: "12:10", inicio: "12:40", fin: "14:00", nombre: "Keynote de cierre «Mr. Scappini Way…» (12:40) y entrega de premios (13:30)", lugar: "Aula Magna", quien: "Dr. Sergio Gramajo, Mg. Diego Bolatti y Mg. Reinaldo Scappini" },
];

// Cada tarea tiene:
//   min     = colaboradores mínimos necesarios (lo que se controla en «Cobertura»)
//   cupo    = máximo de personas que se pueden anotar
//   critico = true si hay que cubrirla sí o sí
//   grupo   = para agrupar en el análisis de cobertura
// Si no se indica, se usan estos valores por rol:
const DEF = {
  tech:   { min: 1, critico: true,  grupo: "Tech assistant en talleres y keynotes" },
  acred:  { critico: true, grupo: "Acreditación" },
  puerta: { min: 1, critico: true,  grupo: "Control de inscriptos en talleres" },
  tour:   { min: 1, critico: false, grupo: "Tour por la facu" },
  poster: { critico: true, grupo: "Pósters" },
  bolsas: { critico: true, grupo: "Bolsas de regalo" },
  armado: { critico: true, grupo: "Bienvenida" },
};
const t = (o) => {
  const x = { ...DEF[o.tipo], ...o };
  if (x.min == null) x.min = Math.max(1, Math.ceil(x.cupo * 0.6));
  x.min = Math.min(x.min, x.cupo);
  return x;
};
export const TAREAS = [
  // Lunes 9 — solo por la tarde, después de las 16:30
  t({ id: "bolsas-lun", d: "l", inicio: "16:30", fin: "19:30", tipo: "bolsas", titulo: "Armado de bolsas de regalo", lugar: "UTN FRRe", cupo: 8, min: 4 }),

  // Miércoles 11 a la mañana — preparación desde las 9 h
  t({ id: "mie-carteles", d: "w", inicio: "09:00", fin: "12:00", tipo: "armado", grupo: "Preparación del miércoles", titulo: "Pegar carteles y señalética", lugar: "Salas, pasillos y hall", detalle: "Carteles de cada sala con su eje, flechas para orientarse y señalética de acreditación y pósters.", cupo: 5, min: 3 }),
  t({ id: "mie-hojas-moderadores", d: "w", inicio: "09:00", fin: "12:00", tipo: "armado", grupo: "Preparación del miércoles", titulo: "Armar las hojas de los moderadores", lugar: "A confirmar", detalle: "Una carpeta por sala y sesión con la grilla, los horarios y los trabajos a presentar.", cupo: 3, min: 2 }),
  t({ id: "mie-preparacion", d: "w", inicio: "09:00", fin: "12:00", tipo: "armado", grupo: "Preparación del miércoles", titulo: "Preparación general: credenciales, materiales y lo que haga falta", lugar: "A confirmar", detalle: "Ordenar credenciales y materiales de acreditación, y otras tareas que surjan.", cupo: 4, min: 2 }),

  // Miércoles 11 — bienvenida a la noche (21 h): preparar antes
  t({ id: "bienvenida-armado", d: "w", inicio: "18:00", fin: "21:00", tipo: "armado", titulo: "Preparar la bienvenida: acomodar el lugar y colocar la decoración", lugar: "A confirmar", detalle: "La bienvenida empieza a las 21:00. Hay que dejar todo listo antes.", cupo: 6, min: 3 }),

  // Acreditación (jueves y viernes), dividida en keynotes y talleres
  t({ id: "acred-jue-keynotes", d: "j", inicio: "08:00", fin: "10:00", tipo: "acred", titulo: "Acreditación · Keynotes", lugar: "Hall de acceso", detalle: "Acreditación 08:30–09:00 para la apertura y la keynote de las 10:00.", cupo: 3, min: 2 }),
  t({ id: "acred-jue-talleres", d: "j", inicio: "08:00", fin: "10:00", tipo: "acred", titulo: "Acreditación · Talleres", lugar: "Hall de acceso", detalle: "Para los talleres del jueves (11:30 y 15:00).", cupo: 2, min: 1 }),
  t({ id: "acred-vie-keynotes", d: "v", inicio: "08:00", fin: "09:30", tipo: "acred", titulo: "Acreditación · Keynotes", lugar: "Hall de acceso", detalle: "Acreditación 08:30–09:00 para el segundo día y la keynote de cierre.", cupo: 2, min: 1 }),
  t({ id: "acred-vie-talleres", d: "v", inicio: "08:00", fin: "10:00", tipo: "acred", titulo: "Acreditación · Talleres", lugar: "Hall de acceso", detalle: "Para los workshops del viernes (10:00).", cupo: 2, min: 1 }),

  // Tech assistant en keynotes
  ...KEYNOTES.map((k) => t({ id: `tech-${k.id}`, d: k.d, inicio: k.prep, fin: k.fin, tipo: "tech", titulo: `Tech assistant · ${k.nombre}`, lugar: k.lugar, detalle: `${k.quien}. Llegar ${k.prep} para preparar la compu y el audio.`, cupo: 1 })),

  // Tech assistant y control de inscriptos en talleres
  ...TALLERES.flatMap((w) => [
    t({ id: `tech-${w.id}`, d: w.d, inicio: w.prep, fin: w.fin, tipo: "tech", titulo: `Tech assistant · ${w.nombre}`, lugar: w.lugar, detalle: `${w.quien}. Empieza ${w.inicio}; llegar ${w.prep} para preparar la compu.`, cupo: 1 }),
    t({ id: `puerta-${w.id}`, d: w.d, inicio: addMin(w.inicio, -20), fin: addMin(w.inicio, 15), tipo: "puerta", titulo: `Control de inscriptos · ${w.nombre}`, lugar: w.lugar, detalle: `En la puerta revisando la lista de inscriptos. Empieza ${w.inicio}.`, cupo: 1 }),
  ]),

  // Tech assistant por sala en cada sesión de ponencias
  ...SESIONES.flatMap((s) => s.salas.map((n) => t({
    id: `tech-s${s.n}-sala${n}`, d: s.d, inicio: s.prep, fin: s.fin, tipo: "tech",
    titulo: `Tech assistant · Sesión ${s.n} · ${s.nombres[n]}`, lugar: s.nombres[n].split("(")[1]?.replace(")", "") || "",
    detalle: `Sesión ${s.n}: ${s.inicio}–${s.fin}. Llegar ${s.prep} para cargar y probar las presentaciones de los expositores.`, cupo: 1,
    grupo: `Tech assistant · Sesión ${s.n} (${s.d === "j" ? "jueves" : "viernes"} ${s.inicio}–${s.fin})`,
  }))),

  // Tour por la facultad
  t({ id: "tour-jue-1", d: "j", inicio: "08:30", fin: "11:30", tipo: "tour", titulo: "Tour por la facu · mañana temprano", lugar: "Toda la facultad", detalle: "Llegada de asistentes, apertura y keynote.", cupo: 2 }),
  t({ id: "tour-jue-2", d: "j", inicio: "11:30", fin: "13:15", tipo: "tour", titulo: "Tour por la facu · Sesión 1", lugar: "Toda la facultad", detalle: "Orientar hacia salas, taller y pósters.", cupo: 2 }),
  t({ id: "tour-jue-3", d: "j", inicio: "14:30", fin: "16:20", tipo: "tour", titulo: "Tour por la facu · Sesión 2", lugar: "Toda la facultad", cupo: 2 }),
  t({ id: "tour-jue-4", d: "j", inicio: "16:20", fin: "18:05", tipo: "tour", titulo: "Tour por la facu · Sesión 3", lugar: "Toda la facultad", cupo: 2 }),
  t({ id: "tour-vie-1", d: "v", inicio: "08:30", fin: "10:45", tipo: "tour", titulo: "Tour por la facu · Sesión 4 y workshops", lugar: "Toda la facultad", cupo: 2 }),
  t({ id: "tour-vie-2", d: "v", inicio: "10:45", fin: "13:30", tipo: "tour", titulo: "Tour por la facu · Sesión 5 y cierre", lugar: "Toda la facultad", cupo: 2 }),

  // Pósters: colgar antes de cada turno y sacar o reemplazar después
  t({ id: "poster-colgar-t1", d: "j", inicio: "10:30", fin: "11:30", tipo: "poster", titulo: "Colgar pósters del Turno 1", lugar: "Hall del Aula Magna y pasillo", detalle: "Turno 1 (Track Estudiantes, trabajos de cátedra) se expone 11:30–13:15. Tiene que estar colgado antes de las 11:30.", cupo: 3, min: 2 }),
  t({ id: "poster-cambio-t1-t2", d: "j", inicio: "15:00", fin: "16:20", tipo: "poster", titulo: "Sacar Turno 1 y colgar pósters del Turno 2", lugar: "Hall del Aula Magna y pasillo", detalle: "Turno 2 (TFC) se expone 16:20–18:05. Tiene que estar colgado antes de las 16:20.", cupo: 3, min: 2 }),
  t({ id: "poster-sacar-t2", d: "j", inicio: "18:05", fin: "18:45", tipo: "poster", titulo: "Sacar pósters del Turno 2", lugar: "Hall del Aula Magna y pasillo", detalle: "Al terminar el Turno 2 (18:05). Si se puede, dejar colgado el Turno 3.", cupo: 2, min: 1 }),
  t({ id: "poster-colgar-t3", d: "v", inicio: "08:00", fin: "09:00", tipo: "poster", titulo: "Colgar pósters del Turno 3", lugar: "Hall del Aula Magna y pasillo", detalle: "Turno 3 (extracátedra) se expone 09:00–10:30. Tiene que estar colgado antes de las 09:00.", cupo: 3, min: 2 }),
  t({ id: "poster-sacar-t3", d: "v", inicio: "10:30", fin: "11:00", tipo: "poster", titulo: "Sacar pósters del Turno 3", lugar: "Hall del Aula Magna y pasillo", detalle: "Al terminar el Turno 3 (10:30).", cupo: 2, min: 1 }),
];

function addMin(hhmm, m) {
  const [h, mi] = hhmm.split(":").map(Number);
  const x = h * 60 + mi + m;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}

// Valida una tarea nueva cargada desde la página. Devuelve { tarea } o { error }.
export function validarTareaNueva(x) {
  const hh = /^([01]\d|2[0-3]):[0-5]\d$/;
  const titulo = String(x?.titulo || "").trim().slice(0, 120);
  const lugar = String(x?.lugar || "").trim().slice(0, 80) || "A confirmar";
  const detalle = String(x?.detalle || "").trim().slice(0, 200);
  const d = String(x?.d || "");
  const inicio = String(x?.inicio || ""), fin = String(x?.fin || "");
  const min = parseInt(x?.min, 10), cupo = parseInt(x?.cupo ?? x?.min, 10);
  if (titulo.length < 3) return { error: "Escribí qué hay que hacer." };
  if (!DIAS.some((z) => z.d === d)) return { error: "Elegí el día." };
  if (!hh.test(inicio) || !hh.test(fin) || aMin(inicio) >= aMin(fin)) return { error: "Revisá el horario: la hora de inicio tiene que ser anterior a la de fin." };
  if (!(min >= 1 && min <= 30)) return { error: "El mínimo de colaboradores tiene que estar entre 1 y 30." };
  if (!(cupo >= min && cupo <= 40)) return { error: "El máximo tiene que ser igual o mayor que el mínimo (hasta 40)." };
  return { tarea: { d, inicio, fin, tipo: "otra", titulo, lugar, detalle, min, cupo, critico: x?.critico !== false, grupo: "Otras tareas", extra: true } };
}

export const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const seSuperponen = (a, b) => a.d === b.d && aMin(a.inicio) < aMin(b.fin) && aMin(b.inicio) < aMin(a.fin);

// Franjas de disponibilidad general (códigos y = Puedo, p = Una parte, q = Posiblemente, n = No puedo, u = Sin marcar)
export const FRANJAS = [
  { k: "l-t", d: "l", nombre: "Tarde (desde 16:30)" },
  { k: "w-m", d: "w", nombre: "Mañana (desde las 9 h)" },
  { k: "w-n", d: "w", nombre: "Antes de la bienvenida (18 a 21 h)" },
  { k: "j-m", d: "j", nombre: "Mañana (8 a 13 h)" },
  { k: "j-t", d: "j", nombre: "Tarde (13 a 18 h)" },
  { k: "j-n", d: "j", nombre: "Después de las 18 h" },
  { k: "v-m", d: "v", nombre: "Mañana (8 a 14 h)" },
];
