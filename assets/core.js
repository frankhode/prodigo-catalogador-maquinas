import {rememberRecordTerms} from './vocabulary.js?v=1.4.2';
import {safeInventoryImage} from './inventory-source.js?v=1.4.2';
import {fields, requiredFields} from './schema.js?v=1.4.2';
export const FORMAT='prodigo-catalogador-maquinas';
export function emptyCatalog(){return {format:FORMAT,schemaVersion:1,updatedAt:null,records:[],vocabularies:{}};}
export function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');}
export function newRecord(records=[]){let n=1;const ids=new Set(records.map(r=>r.id));while(ids.has(`M${String(n).padStart(6,'0')}`))n++;return {id:`M${String(n).padStart(6,'0')}`,status:'Borrador',denomination:'Máquina de escribir',images:[],documents:[],primaryImageId:'',createdAt:new Date().toISOString()};}
// Editing the new screen preserves every earlier property and linked inventory code.
export function identificationDraft(record){
  const draft=structuredClone(record);
  if(draft.denomination==null)draft.denomination='Máquina de escribir';
  return draft;
}
export function title(r){if(r.recordKind==='document')return r.documentTitle||r.documentType||'Documento sin identificar';return [r.brand,r.model].filter(Boolean).join(' ')||'Máquina sin identificar';}
export function missing(r){return (r.recordKind==='document'?['documentTitle','documentType']:requiredFields).filter(k=>!String(r[k]??'').trim());}
export function validateRecord(r,others=[]){
  if(!r.id)throw Error('Falta el número de ficha.');
  if(r.inventorySource&&(r.inventorySource.system!=='prodigo-inventario'||r.inventorySource.code!==r.inventory))throw Error('El código P de una máquina vinculada al inventario no se puede cambiar.');
  if(r.status==='Catalogada'&&missing(r).length)throw Error('Completá marca y modelo antes de marcar la ficha como catalogada.');
  const inv=normalize(r.inventory).trim();
  if(inv&&others.some(o=>o.id!==r.id&&normalize(o.inventory).trim()===inv))throw Error('El identificador de inventario ya está asignado a otra máquina.');
  if(r.modelFrom&&r.modelTo&&/^\d{4}$/.test(r.modelFrom)&&/^\d{4}$/.test(r.modelTo)&&Number(r.modelFrom)>Number(r.modelTo))throw Error('El inicio de fabricación no puede ser posterior al final.');
  return r;
}
export function safeImage(src){return typeof src==='string'&&(/^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/=\s]+$/i.test(src)||safeInventoryImage(src));}
export function parseCatalog(input){
  const c=typeof input==='string'?JSON.parse(input):structuredClone(input);
  if(!c||c.format!==FORMAT||c.schemaVersion!==1||!Array.isArray(c.records)||!c.vocabularies||Array.isArray(c.vocabularies)||typeof c.vocabularies!=='object')throw Error('El archivo no es un catálogo de máquinas compatible (versión 1).');
  const ids=new Set(),inventories=new Set();
  for(const r of c.records){
    if(!r||typeof r.id!=='string'||!r.id.trim()||ids.has(r.id))throw Error('Hay números de ficha vacíos o repetidos.');ids.add(r.id);
    for(const [key] of fields)if(r[key]!=null&&typeof r[key]!=='string')throw Error(`El campo ${key} debe contener texto.`);
    const inv=normalize(r.inventory).trim();if(inv&&inventories.has(inv))throw Error('Hay identificadores de inventario repetidos.');if(inv)inventories.add(inv);
    if(!Array.isArray(r.images)||!Array.isArray(r.documents))throw Error(`Imágenes o documentación inválidas en ${r.id}.`);
    const imageIds=new Set();
    for(const im of r.images){if(!im||typeof im.id!=='string'||!im.id||imageIds.has(im.id)||!safeImage(im.src)||(im.thumb&&!safeImage(im.thumb)))throw Error(`Imagen inválida en ${r.id}.`);imageIds.add(im.id);for(const k of ['name','view','caption'])if(im[k]!=null&&typeof im[k]!=='string')throw Error('La descripción de imagen debe ser texto.');}
    if(r.primaryImageId&&!imageIds.has(r.primaryImageId))throw Error(`Imagen principal inexistente en ${r.id}.`);
    for(const d of r.documents){if(!d||typeof d!=='object'||Array.isArray(d)||Object.values(d).some(v=>typeof v!=='string'))throw Error('Documentación asociada inválida.');}
    validateRecord(r,c.records);
  }
  for(const v of Object.values(c.vocabularies))if(!Array.isArray(v)||v.some(s=>typeof s!=='string'))throw Error('Las listas deben contener textos.');
  return c;
}
export function serialize(c){return JSON.stringify(c,null,2)+'\n';}
export function saveRecord(c,record){
  const next=structuredClone(c),r=structuredClone(record);validateRecord(r,next.records);r.updatedAt=new Date().toISOString();
  const ix=next.records.findIndex(o=>o.id===r.id);if(ix<0)next.records.push(r);else next.records[ix]=r;
  rememberRecordTerms(next,r);
  next.updatedAt=r.updatedAt;return next;
}
export function filterRecords(records,{q='',brand='',status='',pending=''}={}){
  const terms=normalize(q).trim().split(/\s+/).filter(Boolean);
  return records.filter(r=>{
    if(brand&&r.brand!==brand||status&&r.status!==status||pending&&String(r[pending]??'').trim())return false;
    const hay=normalize(JSON.stringify(r, (k,v)=>['src','thumb'].includes(k)?undefined:v));return terms.every(t=>hay.includes(t));
  });
}
export function mergeCatalogs(current,incoming){
  const next=structuredClone(current);const ids=new Set(next.records.map(r=>r.id));
  const collisions=incoming.records.filter(r=>ids.has(r.id));
  if(collisions.length)throw Error(`Hay ${collisions.length} números de ficha ya existentes (${collisions.slice(0,3).map(r=>r.id).join(', ')}). Para recuperar ese catálogo usá Reemplazar.`);
  next.records.push(...structuredClone(incoming.records));
  for(const [k,v] of Object.entries(incoming.vocabularies))next.vocabularies[k]=[...new Set([...(next.vocabularies[k]||[]),...v])];
  next.updatedAt=new Date().toISOString();return parseCatalog(next);
}
