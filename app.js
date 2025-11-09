// Versión Pro: modular, con LocalForage (IndexedDB), gráficos, exportes y PWA hooks.
import { saveAs } from 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js';

// Nombres de keys y wrappers
const KEYS = { REC:'pp_recetas_v3', INV:'pp_inventario_v3', PROD:'pp_producciones_v3', LOT:'pp_lotes_v3', USERS:'pp_usuarios_v3', LOGS:'pp_logs_v3' };

const DB = {
  async get(key){ const v = await localforage.getItem(key); return v || []; },
  async set(key, val){ await localforage.setItem(key, val); }
};
function uid(prefix='id'){ return prefix+'_'+Math.random().toString(36).slice(2,9); }
function now(){ return new Date().toISOString(); }
async function addLog(type,msg){ const logs = await DB.get(KEYS.LOGS); logs.unshift({id:uid('log'),time:now(),type,msg}); await DB.set(KEYS.LOGS, logs); renderActivity(); }

// Inicializar admin si no existe
async function seed(){ const users = await DB.get(KEYS.USERS); if(!users.some(u=>u.user==='admin')){ users.push({id:uid('u'),user:'admin',pass:'22782522',role:'admin'}); await DB.set(KEYS.USERS,users); await addLog('sistema','Admin creado: admin/22782522'); } }

// Render shell
async function renderShell(){ const app = document.getElementById('app'); app.innerHTML = `
  <aside class="panel">
    <div class="header"><div class="logo">P</div><div><b>PICONAS Pro</b><div class="small">Admin / Operario</div></div></div>
    <div class="menu" id="menu">
      <button data-view="overview" class="active">Overview</button>
      <button data-view="recetas">Recetas</button>
      <button data-view="inventario">Inventario</button>
      <button data-view="produccion">Producción</button>
      <button data-view="reportes">Reportes</button>
      <button data-view="usuarios">Usuarios</button>
    </div>
  </aside>
  <main>
    <div id="mainContent"></div>
    <footer class="panel small" style="margin-top:12px">PICONAS Pro · LocalStorage / IndexedDB · v1</footer>
  </main>
  <aside class="panel right">
    <h3>Actividad</h3>
    <div id="activity" class="timeline"></div>
  </aside>
`;
  // attach menu events
  document.querySelectorAll('#menu button').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('#menu button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); loadView(b.dataset.view); }));
  await loadView('overview');
}

// VIEWS: overview, recetas, inventario, produccion, reportes, usuarios
async function loadView(view){ const main = document.getElementById('mainContent'); if(view==='overview') main.innerHTML = await overviewView(); if(view==='recetas') main.innerHTML = recetasView(); if(view==='inventario') main.innerHTML = inventarioView(); if(view==='produccion') main.innerHTML = produccionView(); if(view==='reportes') main.innerHTML = reportesView(); if(view==='usuarios') main.innerHTML = usuariosView(); attachViewHandlers(view); }

// Templates (strings) — keep concise for brevity
function overviewView(){ return `
  <div class="panel card">
    <h2>Overview</h2>
    <div style="display:flex; gap:12px"><div style="flex:1"><canvas id="chartProd" height="120"></canvas></div><div style="width:360px"><div id="alerts"></div><div style="height:12px"></div><button id="btnExportAll" class="btn primary">Exportar todo</button></div></div>
    <div style="margin-top:12px"><h3>Últimas acciones</h3><div id="feed" class="timeline"></div></div>
  </div>
`; }
function recetasView(){ return `
  <div class="panel card"><h2>Recetas</h2>
    <div style="display:flex; gap:12px"><div style="flex:1"><label>Nombre</label><input id="r_name" /><label>Ingredientes (linea: nombre|cantidad|unidad)</label><textarea id="r_ings"></textarea><label>Proceso</label><textarea id="r_proc"></textarea><div style="margin-top:8px"><button id="r_save" class="btn primary">Guardar</button></div></div><div style="width:420px"><div id="r_list"></div></div></div></div>
`; }
function inventarioView(){ return `
  <div class="panel card"><h2>Inventario</h2><div style="display:flex; gap:12px"><div style="flex:1"><label>Ingrediente</label><input id="i_name" /><label>Cantidad</label><input id="i_qty" type="number" step="any" /><label>Unidad</label><input id="i_unit" /><label>Umbral</label><input id="i_th" type="number" value="5" /><div style="margin-top:8px"><button id="i_add" class="btn primary">Agregar</button></div></div><div style="width:420px"><div id="i_list"></div></div></div></div>
`; }
function produccionView(){ return `
  <div class="panel card"><h2>Producción</h2><div style="display:flex; gap:12px"><div style="flex:1"><label>Receta</label><select id="p_select"></select><label>Cantidad</label><input id="p_qty" type="number" step="any" value="1" /><label>Responsable</label><input id="p_resp" /><div style="margin-top:8px"><button id="p_create" class="btn primary">Registrar</button></div></div><div style="width:420px"><div id="p_list"></div></div></div></div>
`; }
function reportesView(){ return `
  <div class="panel card"><h2>Reportes</h2><div><label>Desde</label><input type="date" id="r_from" /><label>Hasta</label><input type="date" id="r_to" /><div style="margin-top:8px"><button id="r_gen" class="btn primary">Generar CSV / PDF</button></div></div><div id="r_out"></div></div>
`; }
function usuariosView(){ return `
  <div class="panel card"><h2>Usuarios</h2><div style="display:flex; gap:12px"><div style="flex:1"><label>Usuario</label><input id="u_user" /><label>Clave</label><input id="u_pass" /><label>Rol</label><select id="u_role"><option value="operario">Operario</option><option value="admin">Admin</option></select><div style="margin-top:8px"><button id="u_save" class="btn primary">Guardar</button></div></div><div style="width:420px"><div id="u_list"></div></div></div></div>
`; }

// Attaching handlers after view render
async function attachViewHandlers(view){ if(view==='overview'){ document.getElementById('btnExportAll').addEventListener('click', exportAll); await renderOverviewWidgets(); } if(view==='recetas'){ document.getElementById('r_save').addEventListener('click', saveReceta); await renderRecetasList(); } if(view==='inventario'){ document.getElementById('i_add').addEventListener('click', addInventario); await renderInventarioList(); } if(view==='produccion'){ document.getElementById('p_create').addEventListener('click', createProduccion); await renderProdSelect(); await renderProduccionesList(); } if(view==='reportes'){ document.getElementById('r_gen').addEventListener('click', generarReporte); } if(view==='usuarios'){ document.getElementById('u_save').addEventListener('click', saveUsuario); await renderUsuariosList(); } }

// Implementation: recetas
async function saveReceta(){ const name = document.getElementById('r_name').value.trim(); const ingsRaw = document.getElementById('r_ings').value.trim(); const proc = document.getElementById('r_proc').value.trim(); if(!name||!ingsRaw){ alert('Nombre e ingredientes'); return; } const ingredientes = ingsRaw.split('\n').map(l=>{ const p=l.split('|').map(x=>x.trim()); return {nombre:p[0]||'', cantidad:parseFloat(p[1]||0), unidad:p[2]||''}; }).filter(x=>x.nombre); const recetas = await DB.get(KEYS.REC); const ex = recetas.find(r=> r.nombre.toLowerCase()===name.toLowerCase()); if(ex){ ex.ingredientes=ingredientes; ex.proceso=proc; ex.updated=now(); await addLog('receta', `Actualizada ${name}`); } else { recetas.push({id:uid('r'),nombre:name,ingredientes,proceso:proc,created:now()}); await addLog('receta', `Creada ${name}`); } await DB.set(KEYS.REC, recetas); renderRecetasList(); }
async function renderRecetasList(){ const cont = document.getElementById('r_list'); cont.innerHTML=''; const recetas = await DB.get(KEYS.REC); if(recetas.length===0){ cont.innerHTML='<div class="small">Sin recetas</div>'; return; } recetas.forEach(r=>{ const div=document.createElement('div'); div.className='card'; div.style.marginBottom='8px'; div.innerHTML = `<div style='display:flex; justify-content:space-between'><div><b>${r.nombre}</b><div class='small'>${r.ingredientes.length} insumos</div></div><div><button class='btn' data-id='${r.id}' data-act='edit'>Editar</button></div></div>`; cont.appendChild(div); }); cont.querySelectorAll('button[data-act="edit"]').forEach(b=> b.addEventListener('click', async ()=>{ const id=b.dataset.id; const recetas = await DB.get(KEYS.REC); const r = recetas.find(x=>x.id===id); document.getElementById('r_name').value = r.nombre; document.getElementById('r_ings').value = r.ingredientes.map(i=>`${i.nombre}|${i.cantidad}|${i.unidad}`).join('\n'); document.getElementById('r_proc').value = r.proceso||''; window.scrollTo({top:0, behavior:'smooth'}); })); }

// Inventario
async function addInventario(){ const name=document.getElementById('i_name').value.trim(); const qty=parseFloat(document.getElementById('i_qty').value)||0; const unit=document.getElementById('i_unit').value.trim(); const th=parseFloat(document.getElementById('i_th').value)||5; if(!name){ alert('Nombre requerido'); return; } const inv = await DB.get(KEYS.INV); const ex = inv.find(i=> i.nombre.toLowerCase()===name.toLowerCase()); if(ex){ ex.cantidad = (parseFloat(ex.cantidad)||0) + qty; ex.unidad = unit || ex.unidad; ex.umbral = th; await addLog('inventario', `Stock actualizado: ${name} +${qty}`); } else { inv.push({id:uid('i'),nombre:name,cantidad:qty,unidad:unit,umbral:th}); await addLog('inventario', `Ingrediente agregado: ${name}`); } await DB.set(KEYS.INV,inv); renderInventarioList(); }
async function renderInventarioList(){ const cont = document.getElementById('i_list'); cont.innerHTML=''; const inv = await DB.get(KEYS.INV); if(inv.length===0){ cont.innerHTML='<div class="small">Inventario vacío</div>'; return; } inv.forEach(i=>{ const d=document.createElement('div'); d.className='card'; d.style.marginBottom='8px'; d.innerHTML = `<div style='display:flex;justify-content:space-between'><div><b>${i.nombre}</b><div class='small'>${i.cantidad} ${i.unidad} • umbral ${i.umbral}</div></div><div><button class='btn' data-id='${i.id}' data-act='sub'>Retirar</button></div></div>`; cont.appendChild(d); }); cont.querySelectorAll('button[data-act="sub"]').forEach(b=> b.addEventListener('click', async ()=>{ const id=b.dataset.id; const q = prompt('Cantidad a retirar:'); const qty = parseFloat(q)||0; if(qty<=0) return; const inv = await DB.get(KEYS.INV); const idx = inv.findIndex(x=>x.id===id); if(idx>=0){ inv[idx].cantidad = Math.max(0, (parseFloat(inv[idx].cantidad)||0)-qty); await DB.set(KEYS.INV,inv); await addLog('inventario', `Retirado ${qty} de ${inv[idx].nombre}`); renderInventarioList(); } })); renderAlerts(); }

// Producción
async function renderProdSelect(){ const sel = document.getElementById('p_select'); sel.innerHTML=''; const rec = await DB.get(KEYS.REC); rec.forEach(r=>{ const opt=document.createElement('option'); opt.value=r.id; opt.textContent=r.nombre; sel.appendChild(opt); }); }
async function createProduccion(){ const recetaId = document.getElementById('p_select').value; const qty = parseFloat(document.getElementById('p_qty').value)||0; const resp = document.getElementById('p_resp').value.trim(); if(!recetaId||qty<=0){ alert('Seleccione receta y cantidad'); return; } const rec = await DB.get(KEYS.REC); const receta = rec.find(r=>r.id===recetaId); const inv = await DB.get(KEYS.INV); const faltan = []; receta.ingredientes.forEach(ing=>{ const need = (parseFloat(ing.cantidad)||0)*qty; const item = inv.find(x=> x.nombre.toLowerCase()===ing.nombre.toLowerCase()); const disp = item? parseFloat(item.cantidad)||0:0; if(disp < need) faltan.push({nombre:ing.nombre, need, disp}); }); if(faltan.length>0 && !confirm('Stock insuficiente. Registrar de todos modos?')) return; receta.ingredientes.forEach(ing=>{ const need = (parseFloat(ing.cantidad)||0)*qty; const idx = inv.findIndex(x=> x.nombre.toLowerCase()===ing.nombre.toLowerCase()); if(idx>=0){ inv[idx].cantidad = Math.max(0, (parseFloat(inv[idx].cantidad)||0)-need); } }); await DB.set(KEYS.INV,inv); const prod = await DB.get(KEYS.PROD); prod.push({id:uid('p'),recetaId,receta:receta.nombre,cantidad:qty,responsable:resp,estado:'completado',time:now()}); await DB.set(KEYS.PROD,prod); await addLog('produccion', `Producción: ${receta.nombre} x${qty}`); renderProduccionesList(); renderInventarioList(); renderChart(); }
async function renderProduccionesList(){ const cont = document.getElementById('p_list'); cont.innerHTML=''; const prod = await DB.get(KEYS.PROD); if(prod.length===0){ cont.innerHTML='<div class="small">Sin producciones</div>'; return; } prod.slice().reverse().forEach(p=>{ const d=document.createElement('div'); d.className='card'; d.style.marginBottom='8px'; d.innerHTML = `<div style='display:flex;justify-content:space-between'><div><b>${p.receta}</b><div class='small'>${p.cantidad} • ${p.estado} • ${new Date(p.time).toLocaleString()}</div></div><div><button class='btn' data-id='${p.id}' data-act='del'>Eliminar</button></div></div>`; cont.appendChild(d); }); cont.querySelectorAll('button[data-act="del"]').forEach(b=> b.addEventListener('click', async ()=>{ if(!confirm('Eliminar registro?')) return; const id=b.dataset.id; const prod = await DB.get(KEYS.PROD); const idx=prod.findIndex(x=>x.id===id); if(idx>=0){ const rem = prod.splice(idx,1); await DB.set(KEYS.PROD,prod); await addLog('produccion', `Eliminado: ${rem[0].receta}`); renderProduccionesList(); renderChart(); } })); }

// Chart & overview
async function renderOverviewWidgets(){ await renderChart(); const feed = document.getElementById('feed'); feed.innerHTML=''; const logs = await DB.get(KEYS.LOGS); logs.slice(0,20).forEach(l=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML = `<div style='display:flex; justify-content:space-between'><div><b>${l.type}</b><div class='small'>${l.msg}</div></div><div class='small'>${new Date(l.time).toLocaleString()}</div></div>`; feed.appendChild(d); }); }
async function renderChart(){ const ctx = document.getElementById('chartProd').getContext('2d'); const prod = await DB.get(KEYS.PROD); const months = {}; prod.forEach(p=>{ const m = new Date(p.time).toLocaleString('default',{month:'short',year:'numeric'}); months[m] = (months[m]||0)+Number(p.cantidad||0); }); const labels = Object.keys(months).slice(-6); const data = labels.map(l=> months[l]||0); if(window._ppChart) window._ppChart.destroy(); window._ppChart = new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Producción',data,backgroundColor:'rgba(6,182,212,0.9)'}]},options:{responsive:true}}); }

// Alerts
async function renderAlerts(){ const inv = await DB.get(KEYS.INV); const cont = document.getElementById('alerts'); cont.innerHTML=''; const low = inv.filter(i=> parseFloat(i.cantidad||0) <= parseFloat(i.umbral||5)); if(low.length===0){ cont.innerHTML='<div class="small">Sin alertas</div>'; return; } low.forEach(i=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML = `<div style='display:flex;justify-content:space-between'><div><b>${i.nombre}</b><div class='small'>${i.cantidad} ${i.unidad}</div></div><div><span class='small'>Bajo</span></div></div>`; cont.appendChild(d); }); }

// Activity
async function renderActivity(){ const logs = await DB.get(KEYS.LOGS); const act = document.getElementById('activity'); if(!act) return; act.innerHTML=''; logs.slice(0,50).forEach(l=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML = `<div style='display:flex;justify-content:space-between'><div><b>${l.type}</b><div class='small'>${l.msg}</div></div><div class='small'>${new Date(l.time).toLocaleString()}</div></div>`; act.appendChild(d); }); }

// Export / Import
async function exportAll(){ const data = { recetas: await DB.get(KEYS.REC), inventario: await DB.get(KEYS.INV), producciones: await DB.get(KEYS.PROD), usuarios: await DB.get(KEYS.USERS), logs: await DB.get(KEYS.LOGS) }; const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); saveAs(blob, 'pp_piconas_backup_'+(new Date()).toISOString().slice(0,10)+'.json'); await addLog('sistema','Exportado backup JSON'); }

// Reportes (CSV / PDF)
async function generarReporte(){ const from = document.getElementById('r_from').value; const to = document.getElementById('r_to').value; const prod = await DB.get(KEYS.PROD); const filtered = prod.filter(p=>{ if(from && new Date(p.time) < new Date(from)) return false; if(to && new Date(p.time) > new Date(to+'T23:59:59')) return false; return true; }); // CSV
  const csvRows = ['receta,cantidad,responsable,estado,fecha']; filtered.forEach(p=> csvRows.push([`"${p.receta}"`,p.cantidad,`"${p.responsable||''}"`,p.estado, new Date(p.time).toLocaleString()].join(','))); const csvBlob = new Blob([csvRows.join('\n')], {type:'text/csv'}); saveAs(csvBlob, 'reporte_produccion_'+(new Date()).toISOString().slice(0,10)+'.csv'); // PDF minimal
  const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFontSize(12); doc.text('Reporte de produccion',14,20); let y=30; filtered.slice(0,20).forEach(p=>{ doc.text(`${p.receta} x${p.cantidad} — ${p.responsable||''} — ${new Date(p.time).toLocaleString()}`,14,y); y+=8; }); doc.save('reporte_produccion_'+(new Date()).toISOString().slice(0,10)+'.pdf'); await addLog('reportes', `Generado reporte: ${filtered.length} items`); }

// Usuarios
async function saveUsuario(){ const user = document.getElementById('u_user').value.trim(); const pass = document.getElementById('u_pass').value.trim(); const role = document.getElementById('u_role').value; if(!user||!pass){ alert('Usuario y clave'); return; } const users = await DB.get(KEYS.USERS); const idx = users.findIndex(u=> u.user.toLowerCase()===user.toLowerCase()); if(idx>=0){ users[idx].pass = pass; users[idx].role = role; await addLog('usuario', `Actualizado ${user}`); } else { users.push({id:uid('u'),user,pass,role}); await addLog('usuario', `Creado ${user}`); } await DB.set(KEYS.USERS, users); renderUsuariosList(); }
async function renderUsuariosList(){ const cont = document.getElementById('u_list'); cont.innerHTML=''; const users = await DB.get(KEYS.USERS); users.forEach(u=>{ const d=document.createElement('div'); d.className='card'; d.style.marginBottom='8px'; d.innerHTML = `<div style='display:flex;justify-content:space-between'><div><b>${u.user}</b><div class='small'>${u.role}</div></div><div><button class='btn' data-id='${u.id}' data-act='del'>Eliminar</button></div></div>`; cont.appendChild(d); }); cont.querySelectorAll('button[data-act="del"]').forEach(b=> b.addEventListener('click', async ()=>{ if(!confirm('Eliminar usuario?')) return; const id=b.dataset.id; const users = await DB.get(KEYS.USERS); const idx = users.findIndex(x=>x.id===id); if(idx>=0){ const rem = users.splice(idx,1); await DB.set(KEYS.USERS, users); await addLog('usuario', `Eliminado ${rem[0].user}`); renderUsuariosList(); } })); }

// Inicio
(async function init(){ await localforage.ready(); await seed(); await renderShell(); })();
