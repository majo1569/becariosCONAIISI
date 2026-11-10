// Página de becarios colaboradores — 14° CoNaIISI 2026.
// La lógica es la misma en Vercel y en Claude; lo único que cambia es `store` (el adaptador de datos),
// que se inyecta antes de este archivo (src/adapter-api.js o src/adapter-claude.js).
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ST=[["y","Puedo"],["p","Una parte"],["q","Posiblemente"],["n","No puedo"]];
const CICLO=["u","y","p","q","n"];
const LABEL={y:"Puedo",p:"Puedo una parte",q:"Posiblemente",n:"No puedo",u:"Sin marcar"};
const VISTAS=[["todo","Todo"],["tareas","Tareas y anotarme"],["tabla","Tabla de colaboradores"],["cobertura","¿Llegamos a los mínimos?"]];

let D={personas:{},inscripciones:{},tareas:[],tipos:{},dias:[],franjas:[]};
let current="",vista="todo",filtro="todas",soloFalta=false,soloImp=false,busy=false,buscar="",cargado=false;
try{current=localStorage.getItem("conaiisi-yo")||"";vista=localStorage.getItem("conaiisi-vista")||"todo"}catch(e){}
if(!VISTAS.some(v=>v[0]===vista))vista="todo";

const aMin=h=>{const[a,b]=h.split(":").map(Number);return a*60+b};
const overlap=(a,b)=>a.d===b.d&&aMin(a.inicio)<aMin(b.fin)&&aMin(b.inicio)<aMin(a.fin);
const nombre=id=>D.personas[id]?.nombre||id;
const corto=id=>{const n=nombre(id);const[ap,no]=n.split(", ");return no?no.split(" ")[0]+" "+ap.split(" ")[0]:n};
const anot=t=>D.inscripciones[t.id]||[];
const tareasDe=p=>D.tareas.filter(t=>anot(t).some(x=>x.persona===p));
const ids=()=>Object.keys(D.personas).sort((a,b)=>nombre(a).localeCompare(nombre(b),"es"));
const diaNombre=d=>(D.dias.find(x=>x.d===d)||{}).nombre||d;
const ordenDia=d=>D.dias.findIndex(x=>x.d===d);
const ordenT=(a,b)=>ordenDia(a.d)-ordenDia(b.d)||aMin(a.inicio)-aMin(b.inicio)||a.titulo.localeCompare(b.titulo,"es");
const val=(id,k)=>(D.personas[id]&&D.personas[id].av&&D.personas[id].av[k])||"u";
const rolNombre=t=>D.tipos[t]?.nombre||t;
const faltaMin=t=>Math.max(0,t.min-anot(t).length);
const tituloCorto=t=>t.titulo.replace(/^Tech assistant · /,"");
// En qué franja de disponibilidad cae una tarea (para los totales de la tabla)
function franjaDe(t){
  const fs=D.franjas.filter(f=>f.d===t.d);if(!fs.length)return null;if(fs.length===1)return fs[0].k;
  const m=aMin(t.inicio),suf=m>=18*60?"n":m>=13*60?"t":"m";
  return (fs.find(f=>f.k.endsWith("-"+suf))||fs[0]).k;
}
function toast(el,msg,cls){const t=$(el);t.textContent=msg;t.className="toast "+(cls||"")}

// ---------- vistas ----------
function renderTabs(){
  const faltan=D.tareas.filter(t=>t.critico&&faltaMin(t)>0).length;
  $("tabs").innerHTML=VISTAS.map(([k,l])=>`<button class="tab" role="tab" type="button" data-v="${k}" aria-selected="${vista===k}">${esc(l)}${k==="cobertura"&&faltan?`<span class="n">${faltan}</span>`:""}</button>`).join("");
  $("tabs").querySelectorAll(".tab").forEach(b=>b.onclick=()=>{vista=b.dataset.v;try{localStorage.setItem("conaiisi-vista",vista)}catch(_){};aplicarVista();renderTabs()});
}
function aplicarVista(){
  document.querySelectorAll("section[data-v]").forEach(s=>{
    const ok=vista==="todo"||s.dataset.v===vista;
    s.style.display=ok?"":"none";
  });
  $("mine-sec").hidden=!current;
}

// ---------- encabezado ----------
function renderStats(){
  const imp=D.tareas.filter(t=>t.critico),impOk=imp.filter(t=>faltaMin(t)===0).length;
  const faltanPers=imp.reduce((s,t)=>s+faltaMin(t),0);
  const activos=new Set();D.tareas.forEach(t=>anot(t).forEach(x=>activos.add(x.persona)));
  $("stats").innerHTML=`<div class="stat"><b class="${impOk===imp.length?"good":"bad"}">${impOk}/${imp.length}</b><span>tareas imprescindibles cubiertas</span></div>
   <div class="stat"><b class="${faltanPers?"bad":"good"}">${faltanPers}</b><span>personas que faltan para los mínimos</span></div>
   <div class="stat"><b>${activos.size}/${Object.keys(D.personas).length}</b><span>colaboradores con alguna tarea</span></div>`;
}
function renderPicker(){
  const sel=$("who");
  sel.innerHTML=`<option value="">Elegí tu nombre…</option>`+ids().map(id=>`<option value="${esc(id)}">${esc(nombre(id))}</option>`).join("");
  if(current&&D.personas[current])sel.value=current;else if(cargado)current="";
}

// ---------- resumen de tareas ----------
function renderResumen(){
  const roles=Object.keys(D.tipos).filter(r=>D.tareas.some(t=>t.tipo===r));
  let tot={n:0,min:0,ok:0,falta:0,anot:0};
  const filas=roles.map(r=>{
    const ts=D.tareas.filter(t=>t.tipo===r),min=ts.reduce((s,t)=>s+t.min,0),ok=ts.reduce((s,t)=>s+Math.min(t.min,anot(t).length),0);
    const an=ts.reduce((s,t)=>s+anot(t).length,0),falta=min-ok,imp=ts.some(t=>t.critico);
    tot.n+=ts.length;tot.min+=min;tot.ok+=ok;tot.falta+=falta;tot.anot+=an;
    const pill=falta===0?`<span class="pill ok">Cubierto</span>`:ok===0?`<span class="pill falta">Falta todo</span>`:`<span class="pill medio">Faltan ${falta}</span>`;
    return `<tr><td><span class="tag ${r}">${esc(rolNombre(r))}</span>${imp?'<span class="must">Imprescindible</span>':""}</td><td class="n">${ts.length}</td><td class="n">${min}</td><td class="n">${an}</td><td class="n">${falta}</td><td>${pill}</td></tr>`}).join("");
  $("sumtbl").innerHTML=`<thead><tr><th>Rol</th><th class="n">Tareas</th><th class="n">Mínimo de personas</th><th class="n">Anotados</th><th class="n">Faltan</th><th>Estado</th></tr></thead><tbody>${filas}</tbody>
   <tfoot><tr><td>Total</td><td class="n">${tot.n}</td><td class="n">${tot.min}</td><td class="n">${tot.anot}</td><td class="n">${tot.falta}</td><td></td></tr></tfoot>`;
  $("roles").innerHTML=Object.entries(D.tipos).map(([k,t])=>`<div><span><span class="tag ${k}">${esc(t.nombre)}</span></span><p>${esc(t.desc)}</p></div>`).join("");
}

// ---------- nueva tarea ----------
function setupNuevaTarea(){
  $("nt-d").innerHTML=D.dias.map(d=>`<option value="${d.d}">${esc(d.nombre)}</option>`).join("");
  $("ntopen").onclick=()=>{$("ntform").hidden=!$("ntform").hidden;if(!$("ntform").hidden)$("nt-titulo").focus()};
  $("addtask").onclick=()=>{
    if(vista!=="todo"&&vista!=="tareas"){vista="tareas";try{localStorage.setItem("conaiisi-vista",vista)}catch(_){};aplicarVista();renderTabs()}
    $("ntform").hidden=false;$("ntform").scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>$("nt-titulo").focus({preventScroll:true}),350);
  };
  $("ntcancel").onclick=()=>{$("ntform").hidden=true;toast("ntstatus","","")};
  $("ntform").onsubmit=async e=>{
    e.preventDefault();
    const min=parseInt($("nt-min").value,10),cupoTxt=$("nt-cupo").value.trim();
    const x={titulo:$("nt-titulo").value.trim(),d:$("nt-d").value,inicio:$("nt-inicio").value,fin:$("nt-fin").value,min,cupo:cupoTxt?parseInt(cupoTxt,10):min,lugar:$("nt-lugar").value.trim(),detalle:$("nt-detalle").value.trim(),critico:$("nt-crit").checked};
    $("ntsave").disabled=true;toast("ntstatus","Guardando…","");
    try{await store.crearTarea(x);toast("ntstatus","","");toast("toast",`Actividad agregada: ${x.titulo} ✓ Ya se pueden anotar.`,"ok");
      $("ntform").reset();$("nt-inicio").value="09:00";$("nt-fin").value="10:00";$("nt-min").value="1";$("nt-crit").checked=true;$("ntform").hidden=true;
    }catch(err){toast("ntstatus",err.message,"err")}
    $("ntsave").disabled=false;
  };
}

// ---------- anotarse ----------
function renderFilters(){
  const roles=Object.keys(D.tipos).filter(r=>D.tareas.some(t=>t.tipo===r));
  const opts=[["todas","Todas"],...roles.map(k=>[k,rolNombre(k)])];
  $("filters").innerHTML=opts.map(([k,l])=>`<button class="chipf" type="button" data-f="${k}" aria-pressed="${filtro===k}">${esc(l)}</button>`).join("")+
   `<label class="chk"><input type="checkbox" id="f-falta" ${soloFalta?"checked":""}> Solo lo que falta cubrir</label><label class="chk"><input type="checkbox" id="f-imp" ${soloImp?"checked":""}> Solo imprescindibles</label>`;
  $("filters").querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{filtro=b.dataset.f;renderFilters();renderTasks()});
  $("f-falta").onchange=e=>{soloFalta=e.target.checked;renderTasks()};
  $("f-imp").onchange=e=>{soloImp=e.target.checked;renderTasks()};
}
let confirmBorrar=null;
function botonTarea(t,persona){
  const l=anot(t),soy=persona&&l.some(x=>x.persona===persona),full=l.length>=t.cupo;
  const choque=!soy&&persona?tareasDe(persona).find(m=>m.id!==t.id&&overlap(m,t)):null;
  if(!persona)return{btn:`<button class="btn small ghost" type="button" disabled>Anotarme</button>`,why:"Elegí tu nombre arriba"};
  if(soy)return{btn:`<button class="btn small ghost" type="button" data-baja="${t.id}">Darme de baja</button>`};
  if(full)return{btn:`<button class="btn small ghost" type="button" disabled>Completo</button>`};
  if(choque)return{btn:`<button class="btn small ghost" type="button" disabled>Anotarme</button>`,why:`Se superpone con otra tarea tuya (${choque.inicio}–${choque.fin})`};
  return{btn:`<button class="btn small" type="button" data-anotar="${t.id}">Anotarme</button>`};
}
function renderTasks(){
  $("days").innerHTML=D.dias.map(dia=>{
    const all=D.tareas.filter(t=>t.d===dia.d);if(!all.length)return "";
    const min=all.reduce((s,t)=>s+t.min,0),ok=all.reduce((s,t)=>s+Math.min(t.min,anot(t).length),0);
    const ts=all.filter(t=>(filtro==="todas"||t.tipo===filtro)&&(!soloFalta||faltaMin(t)>0)&&(!soloImp||t.critico)).sort(ordenT);
    const rows=ts.map(t=>{
      const l=anot(t),soy=l.some(x=>x.persona===current),{btn,why}=botonTarea(t,current),falta=faltaMin(t);
      const cls=["task",soy?"mine":"",l.length>=t.cupo&&!soy?"full":"",falta>0?"need":""].join(" ");
      const borrar=t.extra?(confirmBorrar===t.id?`<button class="btn tiny" type="button" data-borrar-ok="${t.id}">Sí, borrar</button><button class="btn tiny ghost" type="button" data-borrar-no="1">No</button>`:`<button class="btn tiny ghost" type="button" data-borrar="${t.id}">Borrar tarea</button>`):"";
      return `<div class="${cls}">
        <div class="time">${t.inicio}<small>a ${t.fin}</small></div>
        <div class="tbody"><div><span class="tag ${t.tipo}">${esc(rolNombre(t.tipo))}</span>${t.critico&&falta>0?'<span class="must">Imprescindible</span>':""}</div>
          <b>${esc(tituloCorto(t))}</b>
          <div class="meta">${esc(t.lugar)}${t.detalle?" · "+esc(t.detalle):""}</div>
          ${l.length?`<div class="whos">${l.map(x=>`<span class="pp${x.persona===current?" me":""}">${esc(corto(x.persona))}</span>`).join("")}</div>`:""}
        </div>
        <div class="side"><span class="count ${falta===0?"done":l.length===0?"low":"low"}">${l.length}/${t.min}<small>mín. ${t.min}${t.cupo>t.min?` · máx. ${t.cupo}`:""}</small></span>${btn}${why?`<span class="why">${why}</span>`:""}${borrar}</div>
      </div>`}).join("");
    return `<div class="day"><div class="dayhead"><h3>${esc(dia.nombre)}</h3><span>${ok}/${min} personas mínimas cubiertas</span></div>
      <div class="tasks">${rows||'<p class="empty">No hay tareas con este filtro.</p>'}</div></div>`;
  }).join("");
  bindAcciones($("days"),()=>current);
  $("days").querySelectorAll("[data-borrar]").forEach(b=>b.onclick=()=>{confirmBorrar=b.dataset.borrar;renderTasks()});
  $("days").querySelectorAll("[data-borrar-no]").forEach(b=>b.onclick=()=>{confirmBorrar=null;renderTasks()});
  $("days").querySelectorAll("[data-borrar-ok]").forEach(b=>b.onclick=async()=>{
    const t=D.tareas.find(x=>x.id===b.dataset.borrarOk);confirmBorrar=null;
    try{await store.borrarTarea(t.id);toast("toast",`Se borró la tarea «${t.titulo}».`,"ok")}catch(e){toast("toast",e.message,"err")}
  });
}
function renderMine(){
  $("mine-sec").hidden=!current;if(!current)return;
  const ms=tareasDe(current).sort(ordenT);
  $("mine").innerHTML=ms.length?ms.map(t=>`<div><span><span class="t">${esc(diaNombre(t.d))} ${t.inicio}–${t.fin}</span>${esc(t.titulo)} <span class="l">· ${esc(t.lugar)}</span></span><button class="btn small ghost" type="button" data-baja="${t.id}">Darme de baja</button></div>`).join("")
    :`<p class="empty">Todavía no te anotaste en ninguna tarea. Elegí abajo las que puedas cubrir.</p>`;
  bindAcciones($("mine"),()=>current);
}
function bindAcciones(root,quien){
  root.querySelectorAll("[data-anotar]").forEach(b=>b.onclick=()=>accion("anotar",b.dataset.anotar,quien(),b));
  root.querySelectorAll("[data-baja]").forEach(b=>b.onclick=()=>accion("baja",b.dataset.baja,quien(),b));
}
async function accion(tipo,idTarea,persona,btn){
  if(!persona||busy)return;busy=true;if(btn)btn.disabled=true;
  const t=D.tareas.find(x=>x.id===idTarea);
  toast("toast",tipo==="anotar"?"Anotando…":"Sacando…","");
  try{
    if(tipo==="anotar")await store.anotar(idTarea,persona);else await store.baja(idTarea,persona);
    const quien=persona===current?"":` a ${nombre(persona)}`;
    toast("toast",tipo==="anotar"?`Listo, quedó anotado${quien}: ${t.titulo} ✓`:`Listo, se sacó${quien} de: ${t.titulo}`,"ok");
  }catch(e){toast("toast",e.message,"err")}
  busy=false;renderAll();
}

// ---------- tabla de colaboradores ----------
// Cada toque guarda SOLO esa celda (persona + franja). Así, aunque muchos marquen a la vez, nadie pisa lo de otro.
const guardando=new Set();
const colas={};
function renderGrid(){
  const fr=D.franjas;
  const lista=ids().filter(id=>!buscar||nombre(id).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").includes(buscar));
  const head=`<thead><tr><th class="nmh">Colaborador/a</th>${fr.map(f=>`<th class="c dh" title="${esc(f.nombre)}">${esc(diaNombre(f.d).split(" ")[0].slice(0,3))}<br><span style="font-family:var(--body);font-size:11px;color:var(--muted)">${esc(f.nombre.replace(/\s*\(.*\)/,""))}</span></th>`).join("")}<th>Tareas (anotate desde acá)</th></tr></thead>`;
  const body=lista.map(id=>{const p=D.personas[id],mis=tareasDe(id).sort(ordenT);
    const libres=D.tareas.filter(t=>anot(t).length<t.cupo&&!anot(t).some(x=>x.persona===id)&&!mis.some(m=>overlap(m,t))).sort(ordenT);
    return `<tr class="${id===current?"me":""}"><td class="nm">${esc(p.nombre)}${p.nota?`<small>${esc(p.nota)}</small>`:""}</td>`+
      fr.map(f=>{const v=val(id,f.k);return `<td class="c"><button type="button" class="cellb${guardando.has(id+f.k)?" saving":""}" data-p="${esc(id)}" data-k="${f.k}" title="${esc(p.nombre)} · ${esc(diaNombre(f.d))} ${esc(f.nombre)}: ${LABEL[v]} (tocá para cambiar)" aria-label="${esc(p.nombre)}, ${esc(diaNombre(f.d))} ${esc(f.nombre)}: ${LABEL[v]}"><i class="m ${v}">${v==="u"?"?":""}</i></button></td>`}).join("")+
      `<td class="tk">${mis.length?`<div class="whos">${mis.map(t=>`<span class="pp" title="${esc(t.titulo)}">${esc(diaNombre(t.d).slice(0,3))} ${t.inicio} · ${esc(rolNombre(t.tipo))}<button type="button" data-baja-de="${esc(id)}" data-t="${t.id}" aria-label="Sacar a ${esc(p.nombre)} de ${esc(t.titulo)}">×</button></span>`).join("")}</div>`:""}
       <select data-anotar-de="${esc(id)}" aria-label="Anotar a ${esc(p.nombre)} en una tarea"><option value="">＋ Anotar en una tarea…</option>${D.dias.map(d=>{const g=libres.filter(t=>t.d===d.d);return g.length?`<optgroup label="${esc(d.nombre)}">${g.map(t=>`<option value="${t.id}">${t.inicio}–${t.fin} · ${esc(rolNombre(t.tipo))} · ${esc(tituloCorto(t)).slice(0,60)}${faltaMin(t)>0?" (falta gente)":""}</option>`).join("")}</optgroup>`:""}).join("")}</select></td></tr>`}).join("");
  // totales por franja
  const tot=fr.map(f=>{const c={y:0,p:0,q:0,n:0,u:0};ids().forEach(id=>c[val(id,f.k)]++);
    const falta=D.tareas.filter(t=>franjaDe(t)===f.k&&t.critico).reduce((s,t)=>s+faltaMin(t),0);
    return `<td class="c"><div class="tot"><span class="y">✓ ${c.y}${c.p?` +${c.p}`:""}</span><span>? ${c.q}</span>${falta?`<span class="f">faltan ${falta}</span>`:`<span style="color:var(--ok)">ok</span>`}</div></td>`}).join("");
  const anotados=ids().filter(id=>tareasDe(id).length).length;
  const foot=`<tfoot><tr><td class="nm">Totales<small>✓ pueden (+ una parte) · ? posiblemente · faltan para los mínimos imprescindibles</small></td>${tot}<td>${anotados} de ${ids().length} con tareas · ${D.tareas.reduce((s,t)=>s+anot(t).length,0)} lugares ocupados</td></tr></tfoot>`;
  $("grid").innerHTML=head+`<tbody>${body||`<tr><td class="empty" colspan="${fr.length+2}">No hay nadie con ese nombre.</td></tr>`}</tbody>`+foot;
  $("tblcount").textContent=buscar?`${lista.length} de ${ids().length} colaboradores`:`${ids().length} colaboradores`;
  $("grid").querySelectorAll(".cellb").forEach(b=>b.onclick=()=>ciclar(b.dataset.p,b.dataset.k));
  $("grid").querySelectorAll("[data-anotar-de]").forEach(s=>s.onchange=()=>{if(s.value)accion("anotar",s.value,s.dataset.anotarDe,s)});
  $("grid").querySelectorAll("[data-baja-de]").forEach(b=>b.onclick=()=>accion("baja",b.dataset.t,b.dataset.bajaDe,b));
}
function ciclar(id,k){
  const p=D.personas[id];if(!p)return;
  const nuevo=CICLO[(CICLO.indexOf(val(id,k))+1)%CICLO.length];
  p.av={...(p.av||{}),[k]:nuevo};guardando.add(id+k);renderGrid();
  const f=D.franjas.find(x=>x.k===k);
  // Una escritura a la vez por persona: se encolan
  colas[id]=(colas[id]||Promise.resolve()).then(async()=>{
    try{await store.guardarMarca(id,k,nuevo);
      toast("toast",`Guardado: ${p.nombre} · ${diaNombre(f.d)} ${f.nombre}: ${LABEL[nuevo]} ✓`,"ok");
    }catch(e){toast("toast",e.message,"err")}
    guardando.delete(id+k);renderGrid();renderCobertura();
  });
}

// ---------- cobertura ----------
function renderCobertura(){
  const imp=D.tareas.filter(t=>t.critico),impOk=imp.filter(t=>faltaMin(t)===0).length;
  const minImp=imp.reduce((s,t)=>s+t.min,0),okImp=imp.reduce((s,t)=>s+Math.min(t.min,anot(t).length),0);
  const pct=minImp?Math.round(okImp*100/minImp):100;
  const activos=new Set();D.tareas.forEach(t=>anot(t).forEach(x=>activos.add(x.persona)));
  const sinMarcar=ids().filter(id=>D.franjas.every(f=>val(id,f.k)==="u")).length;
  $("covkpi").innerHTML=`
   <div class="kpi"><b class="${pct===100?"good":"bad"}">${pct}%</b><span>de las personas mínimas imprescindibles ya están (${okImp} de ${minImp})</span><div class="bar"><i class="${pct===100?"good":""}" style="width:${pct}%"></i></div></div>
   <div class="kpi"><b class="${impOk===imp.length?"good":"bad"}">${impOk}/${imp.length}</b><span>tareas imprescindibles con el mínimo cubierto</span></div>
   <div class="kpi"><b class="${minImp-okImp?"bad":"good"}">${minImp-okImp}</b><span>personas que faltan anotarse para llegar a los mínimos</span></div>
   <div class="kpi"><b>${activos.size}/${ids().length}</b><span>colaboradores con al menos una tarea · ${sinMarcar} sin marcar disponibilidad</span></div>`;
  // chequeos por grupo
  const grupos=[];D.tareas.slice().sort(ordenT).forEach(t=>{if(!grupos.includes(t.grupo))grupos.push(t.grupo)});
  const orden=g=>{const ts=D.tareas.filter(t=>t.grupo===g);return [ts.some(t=>t.critico)?0:1, ...[ts.reduce((s,t)=>s+faltaMin(t),0)>0?0:1]]};
  grupos.sort((a,b)=>{const x=orden(a),y=orden(b);return x[0]-y[0]||x[1]-y[1]});
  $("covchecks").innerHTML=grupos.map(g=>{
    const ts=D.tareas.filter(t=>t.grupo===g).sort(ordenT),crit=ts.some(t=>t.critico);
    const okN=ts.filter(t=>faltaMin(t)===0).length,falta=ts.reduce((s,t)=>s+faltaMin(t),0);
    const faltantes=ts.filter(t=>faltaMin(t)>0);
    const pill=falta===0?`<span class="pill ok">Cubierto</span>`:`<span class="pill ${crit?"falta":"medio"}">Faltan ${falta} ${falta===1?"persona":"personas"}</span>`;
    return `<div class="check ${falta?(crit?"bad":""):"good"}"><div class="top"><b>${esc(g)}${crit?'<span class="must">Imprescindible</span>':""}</b><span>${okN}/${ts.length} cubiertas ${pill}</span></div>
      ${faltantes.length?`<ul>${faltantes.map(t=>`<li>${esc(diaNombre(t.d))} ${t.inicio}–${t.fin} · ${esc(tituloCorto(t))}: <b>falta${faltaMin(t)>1?"n":""} ${faltaMin(t)}</b>${anot(t).length?` (hay ${anot(t).length})`:""}</li>`).join("")}</ul>`:""}</div>`}).join("");
  // franjas: disponibles vs lo que falta
  $("covfr").innerHTML=`<thead><tr><th>Franja</th><th class="n">Pueden</th><th class="n">Posiblemente</th><th class="n">Faltan (imprescindible)</th></tr></thead><tbody>`+
    D.franjas.map(f=>{const c={y:0,p:0,q:0};ids().forEach(id=>{const v=val(id,f.k);if(c[v]!=null)c[v]++});
      const falta=D.tareas.filter(t=>franjaDe(t)===f.k&&t.critico).reduce((s,t)=>s+faltaMin(t),0);
      return `<tr><td>${esc(diaNombre(f.d))} · ${esc(f.nombre)}</td><td class="n">${c.y+c.p}</td><td class="n">${c.q}</td><td class="n">${falta?`<span class="pill falta">${falta}</span>`:`<span class="pill ok">0</span>`}</td></tr>`}).join("")+`</tbody>`;
  // personas: carga
  const carga=ids().map(id=>({id,n:tareasDe(id).length})).sort((a,b)=>b.n-a.n||nombre(a.id).localeCompare(nombre(b.id),"es"));
  const con=carga.filter(x=>x.n>0),sin=carga.filter(x=>x.n===0);
  $("covpeople").innerHTML=`<thead><tr><th>Colaboradores con tareas</th><th class="n">Tareas</th></tr></thead><tbody>${con.map(x=>`<tr><td>${esc(nombre(x.id))}</td><td class="n">${x.n}</td></tr>`).join("")||`<tr><td colspan="2" class="empty">Todavía nadie se anotó.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="2" style="font-family:var(--body);font-size:13px;font-weight:500">Sin tareas todavía (${sin.length}): ${sin.map(x=>esc(corto(x.id))).join(", ")||"nadie"}</td></tr></tfoot>`;
}

function renderAll(){renderTabs();renderStats();renderResumen();renderMine();renderTasks();renderGrid();renderCobertura();aplicarVista()}

// ---------- eventos generales ----------
$("who").onchange=e=>{current=e.target.value;try{localStorage.setItem("conaiisi-yo",current)}catch(_){};toast("toast","","");renderAll()};
$("buscar").oninput=e=>{buscar=e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();renderGrid()};
$("addme").onclick=()=>{$("newbox").hidden=!$("newbox").hidden;if(!$("newbox").hidden)$("newname").focus()};
$("newok").onclick=async()=>{
  const n=$("newname").value.trim();
  if(n.length<3){toast("toast","Escribí tu apellido y nombre.","err");return}
  try{const id=await store.agregarPersona(n);
    current=id;try{localStorage.setItem("conaiisi-yo",id)}catch(_){}
    $("newbox").hidden=true;$("newname").value="";renderPicker();renderAll();
    toast("toast","Listo, ya estás en la lista. Ahora anotate en tareas y marcá tu disponibilidad en la tabla.","ok");
  }catch(e){toast("toast",e.message,"err")}
};

let primera=true;
store.start(nuevo=>{
  D=nuevo;cargado=true;
  renderPicker();
  if(primera){primera=false;renderFilters();setupNuevaTarea()}
  if(!busy)renderAll();
},st=>{
  if(st.msg){$("dbmsg").textContent=st.msg;$("dbmsg").hidden=false}else $("dbmsg").hidden=true;
});
renderTabs();aplicarVista();
