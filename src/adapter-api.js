// Adaptador para Vercel: habla con /api (Upstash Redis). Sin login.
const store=(()=>{
  let onData=()=>{},onStatus=()=>{},ok=false,ocupado=0;
  async function pedir(path,body){
    const r=await fetch(path,body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"No se pudo guardar. Probá de nuevo.");
    return j;
  }
  async function cargar(){
    try{const j=await pedir("/api/disponibilidad");ok=true;
      onStatus({msg:j.persistente===false?"Atención: la base de datos no está conectada y los cambios no se guardan. Avisale a la organización.":""});
      onData({personas:j.personas,inscripciones:j.inscripciones,tareas:j.tareas,tipos:j.tipos,dias:j.dias,franjas:j.franjas});
    }catch(e){if(!ok)onStatus({msg:"No se pudo cargar la lista. Revisá tu conexión y recargá la página."})}
  }
  async function mutar(path,body){ocupado++;try{const r=await pedir(path,body);await cargar();return r}finally{ocupado--}}
  return{
    async start(d,s){onData=d;onStatus=s;await cargar();
      setInterval(()=>{if(!document.hidden&&!ocupado)cargar()},30000);
      document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!ocupado)cargar()});},
    guardarMarca:(id,k,v)=>mutar("/api/disponibilidad",{id,cambios:{[k]:v}}),
    async agregarPersona(nombre){const r=await mutar("/api/disponibilidad",{nombre});return r.id},
    anotar:(tarea,persona)=>mutar("/api/inscripcion",{tarea,persona,accion:"anotar"}),
    baja:(tarea,persona)=>mutar("/api/inscripcion",{tarea,persona,accion:"baja"}),
    crearTarea:x=>mutar("/api/tarea",{accion:"crear",...x}),
    borrarTarea:id=>mutar("/api/tarea",{accion:"borrar",id}),
  };
})();
