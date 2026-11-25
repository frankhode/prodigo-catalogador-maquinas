import {emptyCatalog,newRecord,normalize,parseCatalog,saveRecord} from './core.js?v=1.5.4';
import {requiredFields} from './schema.js?v=1.4.2';
import {INVENTORY_ENDPOINT,inventoryPhoto} from './inventory-source.js?v=1.5.4';
export {INVENTORY_ENDPOINT};
const isMachine=value=>/^maquinas? (?:de )?escribir$/.test(normalize(value).trim().replace(/\s+/g,' '));
const text=value=>value==null?'':String(value);
function mapped(item){return {brand:text(item.brand),model:text(item.model),year:text(item.manufacture_date),type:text(item.type),inventoryOriginalNumber:text(item.original_number),destination:'Museo'};}
export async function readInventory(fetchImpl=globalThis.fetch){
  const items=[],codes=new Set(),requestId=`${Date.now()}-${Math.random().toString(36).slice(2)}`;let after='';
  for(let page=0;page<1000;page++){
    const url=new URL(INVENTORY_ENDPOINT);url.searchParams.set('_',requestId);if(after)url.searchParams.set('desde',after);
    // Deliberately GET only: never RPC, auth, mutations, or storage uploads.
    const response=await fetchImpl(url.href,{method:'GET',cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error(`No se pudo leer el inventario (${response.status}). Podés seguir con tu JSON.`);
    const data=await response.json();
    if(!Array.isArray(data.items))throw Error('El inventario devolvió una respuesta incompatible.');
    for(const item of data.items){
      if(!item||!/^P\d{6}$/.test(item.code)||codes.has(item.code))throw Error('El inventario devolvió códigos inválidos o repetidos.');
      codes.add(item.code);items.push(item);
    }
    if(!data.next) return items;
    if(!/^P\d{6}$/.test(data.next)||data.next<=after||data.next!==data.items.at(-1)?.code)throw Error('No se pudo completar la lectura del inventario. Reintentá.');
    after=data.next;
  }
  throw Error('El inventario excedió el límite de páginas de lectura.');
}
export function incorporateInventory(catalog=emptyCatalog(),items){
  let next=parseCatalog(catalog);const summary={added:0,updated:0,unchanged:0,conflicts:[],excluded:0,notPresent:0,sourceCount:0};
  const seen=new Set();
  for(const item of items){
    if(!isMachine(item.category)){summary.excluded++;continue;}
    if(!/^P\d{6}$/.test(item.code)||seen.has(item.code))throw Error('Hay códigos de máquinas inválidos o repetidos en el inventario.');seen.add(item.code);
    const existing=next.records.find(r=>normalize(r.inventory).trim()===normalize(item.code));
    const r=existing?structuredClone(existing):{...newRecord(next.records),inventory:item.code};
    const before=JSON.stringify(r),values=mapped(item),previous=r.inventorySource?.fields;
    r.inventory=item.code;
    for(const [key,value] of Object.entries(values)){
      if(r.status==='Catalogada'&&requiredFields.includes(key)&&!value.trim()){if(r[key])summary.conflicts.push({inventory:item.code,field:key});continue;}
      if(!existing||(!previous&&!text(r[key]).trim())||(previous&&r[key]===previous[key]))r[key]=value;
      else if(previous&&r[key]!==value&&previous[key]!==value)summary.conflicts.push({inventory:item.code,field:key});
    }
    // Keep original numeration separate: it may be a serial OR a collector's number.
    const photoCount=Number.isSafeInteger(item.photo_count)&&item.photo_count>=1?item.photo_count:1;
    const oldCount=r.inventorySource?.photoCount||0;
    for(let index=oldCount+1;index<=photoCount;index++){
      const id=`inventory-${item.code}-${index}`;
      if(!r.images.some(im=>im.id===id))r.images.push({id,name:`${item.code}${index>1?`-${index}`:''}.jpg`,view:index===1?'General':'Otro',caption:'Foto del inventario',src:inventoryPhoto(item.code,index)});
      if(!r.primaryImageId)r.primaryImageId=id;
    }
    r.inventorySource={system:'prodigo-inventario',code:item.code,scope:'museo',fields:values,photoCount:Math.max(oldCount,photoCount)};
    if(!existing){next=saveRecord(next,r);summary.added++;}
    else if(JSON.stringify(r)!==before){next=saveRecord(next,r);summary.updated++;}
    else summary.unchanged++;
  }
  summary.sourceCount=seen.size;
  summary.notPresent=next.records.filter(r=>r.inventorySource?.system==='prodigo-inventario'&&!seen.has(r.inventory)).length;
  return {catalog:parseCatalog(next),summary};
}

export async function refreshFromInventory(catalog,fetchImpl=globalThis.fetch){
  const items=await readInventory(fetchImpl);
  return {...incorporateInventory(catalog,items),checkedAt:new Date().toISOString()};
}
