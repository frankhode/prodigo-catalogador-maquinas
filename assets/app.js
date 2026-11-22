import {vocabularyFor} from './vocabulary.js';
import {attachCombo,closePicker} from './combo.js?v=1.2.1';
import {refreshFromInventory} from './inventory.js?v=1.2.1';
import {groups,fields,fieldMap,documentFields,imageViews,requiredFields,bulkFields} from './schema.js';
import {emptyCatalog,newRecord,title,missing,normalize,validateRecord,parseCatalog,serialize,saveRecord,filterRecords,mergeCatalogs} from './core.js';
import {readLocal,writeLocal,download} from './storage.js';
import * as github from './github.js';
import {prepareImage,rotateImage} from './media.js';
const $=id=>document.getElementById(id);
const state={catalog:emptyCatalog(),remoteSha:null,remoteDirty:false,localRevision:null,inventoryCheckedAt:null,selected:new Set(),draft:null,step:0,image:0,dirty:false,visible:[],queue:[],size:1,busy:false,zoom:1,x:0,y:0};
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function option(value,label=value){const e=node('option','',label);e.value=value;return e;}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
async function action(fn,errorId='notice'){
  if(state.busy)return;state.busy=true;document.body.classList.add('busy');$(errorId).textContent='';
  try{await fn();}catch(e){if(errorId==='notice')notice(e.message,true);else $(errorId).textContent=e.message;}finally{state.busy=false;document.body.classList.remove('busy');}
}
async function commit(catalog,{sha=state.remoteSha,remoteDirty=true}={}){
  const revision=crypto.randomUUID();const value={catalog,remoteSha:sha,remoteDirty,revision};
  try{await writeLocal(value,state.localRevision);}catch(e){throw Error(e.message==='LOCAL_CONFLICT'?'Otra pestaña modificó la copia local. Descargá tu respaldo de cambios antes de recargar.':'No se pudo guardar en este navegador (espacio o permisos). Conservá la ficha abierta y descargá un respaldo antes de salir.');}
  state.localRevision=revision;state.catalog=catalog;state.remoteSha=sha;state.remoteDirty=remoteDirty;render();
}
function vocabulary(key){return vocabularyFor(state.catalog,key,state.draft);}
function filters(){return {q:$('search').value,brand:$('brand-filter').value,status:$('status-filter').value,pending:$('pending').value};}
function render(){
  const c=state.catalog;$('total').textContent=c.records.length;$('complete').textContent=c.records.filter(r=>r.status==='Catalogada').length;$('drafts').textContent=c.records.filter(r=>r.status!=='Catalogada').length;
  const prev=$('brand-filter').value;$('brand-filter').replaceChildren(option('','Todas las marcas'),...[...new Set(c.records.map(r=>r.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>option(v)));$('brand-filter').value=prev;
  const status=$('status-filter').value;$('status-filter').replaceChildren(option('','Todos los estados'),...vocabulary('status').map(v=>option(v)));$('status-filter').value=status;
  const visible=filterRecords(c.records,filters());const sort=$('sort').value;
  visible.sort((a,b)=>{
    if(sort==='updatedAt')return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
    if(sort==='year'){const ay=String(a.year||'').match(/\d{4}/)?.[0],by=String(b.year||'').match(/\d{4}/)?.[0];return (Number(ay||99999)-Number(by||99999))||a.id.localeCompare(b.id,'es',{numeric:true});}
    return String(sort==='brand'?title(a):a.id).localeCompare(String(sort==='brand'?title(b):b.id),'es',{numeric:true});
  });state.visible=visible;
  const visibleIds=new Set(visible.map(r=>r.id));for(const id of state.selected)if(!visibleIds.has(id))state.selected.delete(id);
  $('count').textContent=`${visible.length} de ${c.records.length} máquinas${state.selected.size?` · ${state.selected.size} seleccionadas`:''}`;
  $('bulk-open').disabled=!state.selected.size;
  $('gallery').replaceChildren(...visible.map(card));$('gallery').classList.toggle('images-only',$('images-only').checked);
  $('gallery').style.setProperty('--card-size',['155px','230px','320px','440px'][state.size]);$('size').textContent=`Miniaturas: ${['pequeñas','medianas','grandes','muy grandes'][state.size]}`;
  $('empty').hidden=visible.length>0;$('empty-title').textContent=c.records.length?'Sin coincidencias':'La colección empieza acá';$('empty-text').textContent=c.records.length?'Probá con otros filtros o términos.':'Leé las máquinas del inventario o recuperá tu catálogo JSON.';$('empty-new').hidden=c.records.length>0;
  $('storage-status').textContent=`Copia local${c.updatedAt?` · ${new Date(c.updatedAt).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}`:''}${state.remoteDirty?' · cambios sin guardar en GitHub':''}`;
  $('github-state').textContent=`${github.connected()?'Conectado para escritura':'Sin conexión de escritura'}${state.remoteSha?' · versión de partida leída':''}`;
  $('save-online').textContent=state.remoteDirty?'Guardar JSON en GitHub':'JSON en GitHub';
  $('connect-github').textContent=github.connected()?'Desconectar GitHub':'Conectar GitHub';
}
function card(r){
  const c=node('article','card'+(state.selected.has(r.id)?' selected':''));const label=node('label','card-check');const check=node('input');check.type='checkbox';check.checked=state.selected.has(r.id);check.setAttribute('aria-label',`Seleccionar ${r.id}`);check.onchange=()=>{check.checked?state.selected.add(r.id):state.selected.delete(r.id);render();};label.append(check);c.append(label);
  const b=node('button','card-open');b.setAttribute('aria-label',`Editar ${r.id}, ${title(r)}`);b.onclick=()=>openRecord(r.id);
  const image=node('div','card-image'),primary=r.images.find(i=>i.id===r.primaryImageId)||r.images[0];if(primary){const img=node('img');img.src=primary.thumb||primary.src;img.alt=primary.caption||title(r);img.loading='lazy';image.append(img);}else image.append(node('span','placeholder','⌨'));
  const body=node('div','card-body'),code=node('div','card-code');code.append(node('span','',r.id),node('span','badge'+(r.status==='Catalogada'?' done':''),r.status||'Borrador'));body.append(code,node('h2','',title(r)),node('p','card-info',[r.year,r.country,r.type].filter(Boolean).join(' · ')||'Datos por completar'));
  const foot=node('div','card-foot');foot.append(node('span','',r.inventory||'Sin inventario'),node('span','',`${r.images.length} ${r.images.length===1?'imagen':'imágenes'}`));body.append(foot);b.append(image,body);c.append(b);return c;
}
function isDirty(){return state.draft&&state.dirty;}
function closeEditor(){closePicker();if(state.busy)return;if(isDirty()&&!confirm('Hay cambios sin guardar en esta ficha. ¿Descartarlos?'))return;state.draft=null;state.dirty=false;$('editor').close();}
function openRecord(id,queue){
  state.draft=structuredClone(state.catalog.records.find(r=>r.id===id)||newRecord(state.catalog.records));state.dirty=false;
  state.queue=queue||state.visible.map(r=>r.id);state.step=0;state.image=0;
  if($('pending').value){const index=groups.findIndex(g=>g.fields.some(f=>f[0]===$('pending').value));if(index>=0)state.step=index;}
  $('editor-error').textContent='';$('record-id').textContent=`${state.draft.inventory||'SIN INVENTARIO'} · FICHA ${state.draft.id}`;$('editor-title').textContent=title(state.draft);$('delete-record').hidden=!id;
  $('record-source').hidden=!state.draft.inventorySource;$('record-source').textContent=`Inventario ${state.draft.inventory} · Solo lectura del origen. Los cambios de esta ficha se guardan en el JSON del catalogador.`;
  renderStep();renderMedia();if(!$('editor').open)$('editor').showModal();focusField();
}
function focusField(){requestAnimationFrame(()=>{$('fields').querySelector('input,select,textarea,button')?.focus({preventScroll:true});});}
function markDirty(){state.dirty=true;}
function fieldControl(def,value,onchange,prefix='f'){
  const [key,label,type]=def;const wrapper=node('div','field-control'+(type==='area'?' wide':''));const caption=node('label');caption.htmlFor=`${prefix}-${key}`;caption.append(node('span','',label));wrapper.append(caption);
  const input=node(type==='area'?'textarea':'input');input.id=`${prefix}-${key}`;input.name=key;input.value=value||'';
  if(key==='inventory'&&state.draft?.inventorySource){input.readOnly=true;input.title='Código conservado del inventario de Pródigo';}
  if(requiredFields.includes(key)&&prefix==='f'){caption.classList.add('required');input.setAttribute('aria-description','Necesario para marcar como catalogada');}
  input.addEventListener('input',()=>onchange(input.value));wrapper.append(input);
  const vocabularyKey=prefix.startsWith('doc-')?`document.${key}`:key;
  attachCombo(input,{label,getOptions:()=>vocabulary(vocabularyKey),onChange:onchange});return wrapper;
}
function renderStep(){
  closePicker();
  const group=groups[state.step];$('steps').replaceChildren(...groups.map((g,i)=>{const b=node('button',i===state.step?'active':'',`${i+1}. ${g.title}`);b.type='button';b.setAttribute('aria-current',i===state.step?'step':'false');b.onclick=()=>{state.step=i;renderStep();focusField();};return b;}));
  $('step-counter').textContent=`SECCIÓN ${state.step+1} DE ${groups.length}`;$('step-title').textContent=group.title;
  const form=$('fields');form.replaceChildren();form.className='';
  if(group.id==='documentation'){renderDocs();}else{form.className='field-grid';for(const def of group.fields)form.append(fieldControl(def,state.draft[def[0]],v=>{state.draft[def[0]]=v;markDirty();}));if(group.id==='identification'){const hint=node('p','muted','* Marca y modelo son necesarios para marcar la ficha como catalogada.');hint.style.gridColumn='1 / -1';hint.style.fontSize='11px';form.append(hint);}}
  $('prev-step').disabled=state.step===0;$('next-step').disabled=state.step===groups.length-1;
  document.querySelector('.entry').scrollTo(0,0);
}
function renderDocs(){
  const form=$('fields');if(!state.draft.documents.length)form.append(node('p','doc-empty','Libros, publicidades, efímeras, garantías y otros documentos vinculados a esta máquina.'));
  state.draft.documents.forEach((doc,index)=>{const wrap=node('div','doc'),grid=node('div','field-grid');
    for(const def of documentFields)grid.append(fieldControl(def,doc[def[0]],v=>{doc[def[0]]=v;markDirty();},`doc-${index}`));
    const remove=node('button','danger subtle','Quitar documento');remove.type='button';remove.onclick=()=>{if(!confirm('¿Quitar este documento de la ficha?'))return;state.draft.documents.splice(index,1);markDirty();renderStep();};wrap.append(grid,remove);form.append(wrap);
  });
  const add=node('button','','＋ Agregar documento');add.type='button';add.onclick=()=>{state.draft.documents.push({type:'Libro',title:'',date:'',reference:'',notes:''});markDirty();renderStep();};form.append(add);
}
function currentImage(){return state.draft?.images[state.image];}
function transformImage(){$('main-image').style.transform=`translate(${state.x}px,${state.y}px) scale(${state.zoom})`;}
function resetZoom(){state.zoom=1;state.x=0;state.y=0;transformImage();}
function renderMedia(){
  closePicker();
  const image=currentImage();$('main-image').hidden=!image;$('no-image').hidden=Boolean(image);$('image-details').hidden=!image;
  if(image){$('main-image').src=image.src;$('main-image').alt=image.caption||image.name||'Máquina en catalogación';$('image-view').value=image.view||'General';$('image-caption').value=image.caption||'';$('set-primary').disabled=image.id===state.draft.primaryImageId;$('set-primary').textContent=image.id===state.draft.primaryImageId?'★ Imagen principal':'Usar como principal';}else $('main-image').removeAttribute('src');
  $('thumbnails').replaceChildren(...state.draft.images.map((im,i)=>{const b=node('button','thumb'+(state.image===i?' active':''));b.title=`${im.view}: ${im.name}`;b.setAttribute('aria-label',`Ver imagen ${i+1}: ${im.name}`);const img=node('img');img.src=im.thumb||im.src;img.alt=im.name;b.append(img);if(im.id===state.draft.primaryImageId)b.append(node('span','star','★'));b.onclick=()=>{state.image=i;renderMedia();};return b;}));
  for(const id of ['zoom-out','zoom-in','zoom-fit','rotate-image','fullscreen-image'])$(id).disabled=!image;resetZoom();
}
async function persistDraft(next=false){
  const r=structuredClone(state.draft);for(const [key] of fields)if(typeof r[key]==='string')r[key]=r[key].trim();
  validateRecord(r,state.catalog.records);await commit(saveRecord(state.catalog,r));state.dirty=false;
  const index=state.queue.indexOf(r.id);const nextId=index>=0?state.queue[index+1]:null;
  if(next&&nextId&&nextId!==r.id){openRecord(nextId,state.queue);}else{state.draft=null;$('editor').close();notice(next?'Ficha guardada. Terminaste el recorrido.':'Ficha guardada en la copia local.');}
}
function exportCatalog(){let c=state.catalog;if(state.draft&&state.dirty){const draft=structuredClone(state.draft);draft.status=missing(draft).length?'Borrador':draft.status;c=saveRecord(c,draft);}download(serialize(c),`prodigo-maquinas-${new Date().toLocaleDateString('en-CA')}.json`);}
async function refreshInventory(){
  $('inventory-state').textContent='Leyendo máquinas del inventario…';
  try{
    const result=await refreshFromInventory(state.catalog);
    if(result.summary.added||result.summary.updated)await commit(result.catalog);
    const s=result.summary;state.inventoryCheckedAt=result.checkedAt;
    const checked=new Date(result.checkedAt).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'medium'});
    $('inventory-state').textContent=`Consultado ${checked} · ${s.sourceCount} máquinas en Museo · ${s.added} nuevas · ${s.updated} actualizadas${s.notPresent?` · ${s.notPresent} fichas previas conservadas fuera de la lectura actual`:''}`;
    notice(`Inventario leído. ${s.conflicts.length?`${s.conflicts.length} diferencias conservan tu edición del catalogador. `:''}${state.remoteDirty?'Guardá el JSON en GitHub para compartir los cambios.':'El JSON está al día.'}`);
  }catch(e){$('inventory-state').textContent='Inventario no disponible. Tu catálogo JSON se conserva.';throw e;}
}
function requestGithubConnection(){state.saveAfterConnect=true;$('token').value='';$('connection-error').textContent='';$('connection').showModal();}
async function saveOnline(errorId='notice'){
  if(!github.connected()){requestGithubConnection();return;}
  await action(async()=>{const sha=await github.writeRemote(state.catalog,state.remoteSha);await commit(state.catalog,{sha,remoteDirty:false});notice('Catalogación guardada en data/catalogo.json de GitHub.');},errorId);
}
function bind(){
  $('inventory-refresh').onclick=()=>action(refreshInventory);
  $('save-online').onclick=()=>saveOnline();
  $('new').onclick=$('empty-new').onclick=()=>openRecord();$('close-editor').onclick=closeEditor;
  $('editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
  $('search').oninput=render;for(const id of ['brand-filter','status-filter','pending','sort','images-only'])$(id).onchange=render;
  $('clear').onclick=()=>{for(const id of ['search','brand-filter','status-filter','pending'])$(id).value='';render();};
  $('size').onclick=()=>{state.size=(state.size+1)%4;render();};
  $('select-all').onclick=()=>{state.visible.forEach(r=>state.selected.add(r.id));render();};$('select-none').onclick=()=>{state.selected.clear();render();};
  $('review-start').onclick=()=>{const queue=state.visible.filter(r=>!state.selected.size||state.selected.has(r.id)).map(r=>r.id);if(queue.length)openRecord(queue[0],queue);else notice('No hay máquinas que coincidan con los filtros.');};
  $('prev-step').onclick=()=>{if(state.step>0){state.step--;renderStep();focusField();}};$('next-step').onclick=()=>{if(state.step<groups.length-1){state.step++;renderStep();focusField();}};
  $('save-record').onclick=()=>action(()=>persistDraft(),'editor-error');$('save-next').onclick=()=>action(()=>persistDraft(true),'editor-error');
  $('fields').onsubmit=e=>e.preventDefault();
  $('fields').onkeydown=e=>{if(e.key!=='Enter'||e.ctrlKey||e.metaKey||e.shiftKey||e.isComposing||e.target.tagName==='TEXTAREA'||e.target.tagName==='BUTTON')return;e.preventDefault();const inputs=[...$('fields').querySelectorAll('input,select,textarea')].filter(input=>!input.closest('.value-picker')&&!input.disabled);const next=inputs[inputs.indexOf(e.target)+1];if(next)next.focus();else if(state.step<groups.length-1){state.step++;renderStep();focusField();}else $('save-record').focus();};
  $('editor').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();action(()=>persistDraft(e.shiftKey),'editor-error');}});
  $('delete-record').onclick=()=>action(async()=>{if(!confirm(`¿Eliminar ${state.draft.id} y todas sus imágenes? Esta acción se aplica a la copia local.`))return;const c=structuredClone(state.catalog);c.records=c.records.filter(r=>r.id!==state.draft.id);c.updatedAt=new Date().toISOString();await commit(c);state.draft=null;state.dirty=false;$('editor').close();notice('Ficha eliminada de la copia local.');},'editor-error');
  $('image-files').onchange=()=>{const files=[...$('image-files').files];$('image-files').value='';action(async()=>{let added=0;try{for(const file of files){$('editor-error').textContent=`Preparando imagen ${added+1} de ${files.length}…`;const im=await prepareImage(file);state.draft.images.push(im);state.image=state.draft.images.length-1;if(!state.draft.primaryImageId)state.draft.primaryImageId=im.id;markDirty();added++;}}finally{renderMedia();}$('editor-error').textContent='';},'editor-error');};
  $('image-view').oninput=()=>{currentImage().view=$('image-view').value;markDirty();};$('image-caption').oninput=()=>{currentImage().caption=$('image-caption').value;markDirty();};
  $('set-primary').onclick=()=>{state.draft.primaryImageId=currentImage().id;markDirty();renderMedia();};
  $('remove-image').onclick=()=>{if(!confirm('¿Quitar esta imagen de la ficha?'))return;const [removed]=state.draft.images.splice(state.image,1);if(removed.id===state.draft.primaryImageId)state.draft.primaryImageId=state.draft.images[0]?.id||'';state.image=Math.max(0,state.image-1);markDirty();renderMedia();};
  $('rotate-image').onclick=()=>action(async()=>{state.draft.images[state.image]=await rotateImage(currentImage());markDirty();renderMedia();},'editor-error');
  $('zoom-in').onclick=()=>{state.zoom=Math.min(6,state.zoom*1.3);transformImage();};$('zoom-out').onclick=()=>{state.zoom=Math.max(.5,state.zoom/1.3);transformImage();};$('zoom-fit').onclick=resetZoom;
  let pointer=null;$('image-stage').onpointerdown=e=>{if(!currentImage())return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,ox:state.x,oy:state.y};$('image-stage').setPointerCapture(e.pointerId);};$('image-stage').onpointermove=e=>{if(!pointer)return;state.x=pointer.ox+e.clientX-pointer.x;state.y=pointer.oy+e.clientY-pointer.y;transformImage();};$('image-stage').onpointerup=$('image-stage').onpointercancel=()=>pointer=null;
  $('fullscreen-image').onclick=()=>{$('lightbox-image').src=currentImage().src;$('lightbox').showModal();};
  $('data-open').onclick=()=>{$('data-error').textContent='';$('data-dialog').showModal();};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(state.busy)return;$(b.dataset.close).close();if(b.dataset.close==='connection')$('token').value='';});
  $('export-json').onclick=()=>action(()=>exportCatalog(),'data-error');$('editor-backup').onclick=()=>action(()=>exportCatalog(),'editor-error');
  $('import-json').onchange=()=>{const file=$('import-json').files[0];$('import-json').value='';if(!file)return;action(async()=>{const incoming=parseCatalog(await file.text()),mode=$('import-mode').value;if(mode==='replace'&&state.catalog.records.length&&!confirm('¿Reemplazar la copia local por este JSON? Descargá un respaldo antes si necesitás conservarla.'))return;const c=mode==='merge'?mergeCatalogs(state.catalog,incoming):incoming;await commit(c,{remoteDirty:true});state.selected.clear();render();$('data-dialog').close();notice(`${incoming.records.length} fichas importadas. Guardá un respaldo al terminar.`);},'data-error');};
  $('connect-github').onclick=()=>{state.saveAfterConnect=false;if(github.connected()){github.disconnect();render();return;}$('token').value='';$('connection-error').textContent='';$('connection').showModal();};
  $('connection-form').onsubmit=e=>{e.preventDefault();const token=$('token').value;$('token').value='';action(async()=>{await github.connect(token);if(state.saveAfterConnect){const sha=await github.writeRemote(state.catalog,state.remoteSha);await commit(state.catalog,{sha,remoteDirty:false});notice('Catalogación guardada en data/catalogo.json de GitHub.');}state.saveAfterConnect=false;$('connection').close();render();},'connection-error');};
  $('read-github').onclick=()=>action(async()=>{if(state.catalog.records.length&&!confirm('¿Reemplazar tu copia local por la de GitHub? Descargá antes tu JSON si tenés cambios que querés conservar.'))return;const remote=await github.readRemote();await commit(remote.catalog,{sha:remote.sha,remoteDirty:false});state.selected.clear();render();$('data-error').textContent='Versión de GitHub cargada en la copia local.';await refreshInventory();},'data-error');
  $('save-github').onclick=()=>saveOnline('data-error');
  $('bulk-open').onclick=()=>{$('bulk-summary').textContent=`${state.selected.size} máquinas seleccionadas: ${[...state.selected].slice(0,6).join(', ')}${state.selected.size>6?'…':''}`;$('bulk-error').textContent='';$('bulk-value').value='';bulkOptions();$('bulk-dialog').showModal();};
  $('bulk-field').onchange=bulkOptions;
  $('bulk-form').onsubmit=e=>{e.preventDefault();action(async()=>{const key=$('bulk-field').value,value=$('bulk-value').value.trim();if(!value)throw Error('Ingresá un valor.');if(!confirm(`¿Aplicar «${value}» a ${state.selected.size} máquinas?`))return;let next=state.catalog;for(const id of state.selected){const r=structuredClone(next.records.find(r=>r.id===id));r[key]=value;next=saveRecord(next,r);}await commit(next);state.selected.clear();$('bulk-dialog').close();render();notice('Cambio aplicado a las fichas seleccionadas.');},'bulk-error');};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.busy&&!$('editor').open&&Date.now()-new Date(state.inventoryCheckedAt||0).getTime()>60000)action(refreshInventory);});
  window.addEventListener('beforeunload',e=>{if(isDirty()){e.preventDefault();e.returnValue='';}});
}
function bulkOptions(){closePicker();}
async function init(){
  state.busy=true;document.body.classList.add('busy');
  $('pending').append(...fields.filter(f=>f[0]!=='status').map(f=>option(f[0],f[1])));$('bulk-field').append(...bulkFields.map(k=>option(k,fieldMap.get(k)[1])));attachCombo($('image-view'),{label:'Vista de imagen',getOptions:()=>vocabulary('image.view'),onChange:value=>{if(currentImage()){currentImage().view=value;markDirty();renderMedia();}}});
  attachCombo($('image-caption'),{label:'Descripción de imagen',getOptions:()=>vocabulary('image.caption'),onChange:value=>{if(currentImage()){currentImage().caption=value;markDirty();}}});
  attachCombo($('bulk-value'),{label:'Valor para seleccionadas',getOptions:()=>vocabulary($('bulk-field').value),onChange:()=>{}});bind();
  try{const saved=await readLocal();if(saved){state.localRevision=saved.revision||null;state.catalog=parseCatalog(saved.catalog);state.remoteSha=saved.remoteSha||null;state.remoteDirty=Boolean(saved.remoteDirty);}else{try{const remote=await github.readRemote();await commit(remote.catalog,{sha:remote.sha,remoteDirty:false});}catch{notice('Catálogo vacío. Podés crear fichas o importar un JSON.');}}}catch(e){notice(`No se pudo recuperar la copia local: ${e.message}. Podés importar un respaldo.`,true);}
  render();
  // Always consult the source, even when IndexedDB or GitHub already has records.
  try{await refreshInventory();}catch(e){notice(e.message,true);}
  state.busy=false;document.body.classList.remove('busy');
}
init();
