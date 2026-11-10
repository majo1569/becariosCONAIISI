// Adaptador para la página publicada en Claude: usa la base del artefacto (window.claude, capacidad "db").
// Colecciones: disponibilidad/<persona>, inscripciones/<tarea>__<n> (un documento por lugar del cupo),
// tareas_extra/<id>, historial/<auto>.
const store=(()=>{
  const CFG=/*CONFIG*/null;
  let db=null,onData=()=>{},onStatus=()=>{};
  const S={personas:{},insc:{},extra:{}},ok={p:false,i:false,e:false};
  const TAB="tab-"+Math.random().toString(36).slice(2);
  const aMin=h=>{const[a,b]=h.split(":").map(Number);return a*60+b};
  const overlap=(a,b)=>a.d===b.d&&aMin(a.inicio)<aMin(b.fin)&&aMin(b.inicio)<aMin(a.fin);
  const tareas=()=>[...CFG.tareas,...Object.entries(S.extra).map(([id,t])=>({...t,id})).sort((a,b)=>(a.creada||"").localeCompare(b.creada||""))];
  function emitir(){
    const ins={};Object.values(S.insc).forEach(x=>{(ins[x.tarea]||=[]).push({persona:x.persona,cuando:x.cuando||"",lugar:x.lugar})});
    Object.values(ins).forEach(l=>l.sort((a,b)=>a.cuando.localeCompare(b.cuando)));
    onData({personas:S.personas,inscripciones:ins,tareas:tareas(),tipos:CFG.tipos,dias:CFG.dias,franjas:CFG.franjas});
  }
  const err=e=>new Error(e&&e.code==="not_granted"?"No tenés permiso para guardar en esta página. Pedile acceso a la organización.":e&&e.code==="quota_exceeded"?"La base de la página está llena. Avisale a la organización.":"No se pudo guardar. Probá de nuevo.");
  const log=d=>db.collection("historial").add({...d,cuando:new Date().toISOString()}).catch(()=>{});
  const necesitaDb=()=>{if(!db)throw new Error("Todavía no se conectó la base. Esperá un momento o entrá con tu cuenta de Claude.")};
  const anotados=id=>Object.values(S.insc).filter(x=>x.tarea===id);
  return{
    async start(d,s){onData=d;onStatus=s;emitir();
      const t=setTimeout(()=>{if(!ok.p)onStatus({msg:"No se pudo cargar la lista todavía. Para anotarte tenés que abrir la página con tu cuenta de Claude iniciada."})},10000);
      try{db=await window.claude?.use?.("db")}catch(e){db=null}
      if(!db)return;
      const fallo=e=>{clearTimeout(t);onStatus({msg:"No se pudieron leer los datos ("+(e&&e.code||"error")+"). Recargá la página."})};
      db.collection("disponibilidad").onSnapshot(snap=>{
        const p={};snap.docs.forEach(x=>{const v=x.data();if(v&&v.nombre)p[x.id]=v});S.personas=p;
        if(!snap.metadata.fromCache){ok.p=true;clearTimeout(t);onStatus({msg:""})}emitir();
      },fallo);
      db.collection("inscripciones").onSnapshot(snap=>{
        const m={};snap.docs.forEach(x=>{const v=x.data();if(v&&v.persona&&v.tarea)m[x.id]=v});S.insc=m;ok.i=true;emitir();
      },fallo);
      db.collection("tareas_extra").onSnapshot(snap=>{
        const m={};snap.docs.forEach(x=>{const v=x.data();if(v&&v.titulo&&!v.borrada)m[x.id]=v});S.extra=m;ok.e=true;emitir();
      },fallo);
    },
    async guardarDisponibilidad(id,nombre,av,nota){necesitaDb();
      try{await db.collection("disponibilidad").doc(id).update({av,nota,actualizado:new Date().toISOString()});log({tipo:"disponibilidad",id,av,nota})}catch(e){throw err(e)}},
    async agregarPersona(nombre,claves){necesitaDb();
      const id=nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
      if(!id)throw new Error("Nombre no válido.");
      if(S.personas[id])return id;
      const av={};claves.forEach(k=>av[k]="u");
      try{await db.collection("disponibilidad").doc(id).set({nombre,av,nota:"",actualizado:new Date().toISOString()});log({tipo:"alta",id,nombre})}catch(e){throw err(e)}
      return id;},
    // Ocupar un lugar: lease corto con acquire, se lee y se escribe solo si está libre. Nunca se pasa el cupo.
    async anotar(idTarea,persona){necesitaDb();
      const t=tareas().find(x=>x.id===idTarea);if(!t)throw new Error("Esa tarea ya no existe.");
      if(!S.personas[persona])throw new Error("No encontramos ese nombre en la lista.");
      const l=anotados(t.id);if(l.some(x=>x.persona===persona))return;
      const mis=tareas().filter(x=>anotados(x.id).some(y=>y.persona===persona));
      const choque=mis.find(m=>m.id!==t.id&&overlap(m,t));
      if(choque)throw new Error(`Ya está en otra tarea a esa hora (${choque.inicio}–${choque.fin}).`);
      const ocupados=new Set(l.map(x=>x.lugar));
      try{
        for(let n=0;n<t.cupo;n++){
          if(ocupados.has(n))continue;
          const ref=db.collection("inscripciones").doc(`${t.id}__${n}`);
          const lease=await ref.acquire({holder:TAB,ttlMs:5000});if(!lease.acquired)continue;
          const snap=await ref.get();const x=snap.exists?snap.data():null;if(x&&x.persona)continue;
          await ref.set({tarea:t.id,lugar:n,persona,cuando:new Date().toISOString()});
          S.insc[`${t.id}__${n}`]={tarea:t.id,lugar:n,persona,cuando:new Date().toISOString()};emitir();
          log({tipo:"anotar",tarea:t.id,titulo:t.titulo,id:persona});return;
        }
      }catch(e){throw err(e)}
      throw new Error("Esta tarea ya tiene el cupo completo.");},
    async baja(idTarea,persona){necesitaDb();
      const x=anotados(idTarea).find(y=>y.persona===persona);if(!x)return;
      try{await db.collection("inscripciones").doc(`${idTarea}__${x.lugar}`).delete();delete S.insc[`${idTarea}__${x.lugar}`];emitir();
        log({tipo:"baja",tarea:idTarea,id:persona})}catch(e){throw err(e)}},
    async crearTarea(x){necesitaDb();
      const hh=/^([01]\d|2[0-3]):[0-5]\d$/,titulo=String(x.titulo||"").trim().slice(0,120);
      const min=parseInt(x.min,10),cupo=parseInt(x.cupo??x.min,10);
      if(titulo.length<3)throw new Error("Escribí qué hay que hacer.");
      if(!CFG.dias.some(z=>z.d===x.d))throw new Error("Elegí el día.");
      if(!hh.test(x.inicio)||!hh.test(x.fin)||aMin(x.inicio)>=aMin(x.fin))throw new Error("Revisá el horario: la hora de inicio tiene que ser anterior a la de fin.");
      if(!(min>=1&&min<=30))throw new Error("El mínimo de colaboradores tiene que estar entre 1 y 30.");
      if(!(cupo>=min&&cupo<=40))throw new Error("El máximo tiene que ser igual o mayor que el mínimo (hasta 40).");
      const slug=titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);
      const id=`extra-${x.d}-${x.inicio.replace(":","")}-${slug}-${Math.random().toString(36).slice(2,6)}`;
      const t={d:x.d,inicio:x.inicio,fin:x.fin,tipo:"otra",titulo,lugar:String(x.lugar||"").trim().slice(0,80)||"A confirmar",detalle:String(x.detalle||"").trim().slice(0,200),min,cupo,critico:x.critico!==false,grupo:"Otras tareas",extra:true,creada:new Date().toISOString()};
      try{await db.collection("tareas_extra").doc(id).set(t);S.extra[id]=t;emitir();log({tipo:"tarea-nueva",tarea:id,titulo})}catch(e){throw err(e)}
      return{...t,id};},
    async borrarTarea(id){necesitaDb();
      const t=S.extra[id];if(!t)throw new Error("Solo se pueden borrar tareas agregadas desde la página.");
      try{for(const x of anotados(id)){await db.collection("inscripciones").doc(`${id}__${x.lugar}`).delete();delete S.insc[`${id}__${x.lugar}`]}
        await db.collection("tareas_extra").doc(id).delete();delete S.extra[id];emitir();log({tipo:"tarea-borrada",tarea:id,titulo:t.titulo})}catch(e){throw err(e)}},
  };
})();
