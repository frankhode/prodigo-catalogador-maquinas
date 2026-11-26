// Production: the P record is the only authority for these fields. The M
// payload retains exclusively cataloguing data, plus optional legacy evidence.
import {normalize} from './core.js?v=1.5.5';
import {fieldMap} from './schema.js?v=1.5.5';
const text=value=>value==null?'':String(value);
const match=(key,value)=>fieldMap.get(key)[3].find(option=>normalize(option)===normalize(value))||'';
const own=(obj,key)=>Object.hasOwn(obj||{},key);
export const COMMON_FIELDS=['brand','model','year','serial','inventoryNotes','color','type','version','country','keyboardLanguage','keyboardLayout'];
const pairs=[['keyboardLanguage','keyboardLayout']];
const isLegacyType=value=>/^(?:de escritorio|escritorio|portatil|ultraportatil)$/.test(normalize(value).trim());
export function machineTypeAndVersion(item){
  const details=item.guided_details?.fields||{},stored=text(item.type).trim();
  const explicit=own(details,'Tipo'),legacyType=!explicit&&isLegacyType(stored);
  const combined=text(details['Versión / país']).trim();
  return {type:explicit?text(details.Tipo):legacyType?stored:'',
    version:explicit?stored:(!legacyType&&stored)||(match('country',combined)?'':combined)};
}
export function commonFields(item){
  const details=item.guided_details?.fields||{};
  const combined=text(details['Versión / país']).trim();
  const keyboard=text(details.Teclado).trim();
  const oldCountry=match('country',combined),oldLanguage=match('keyboardLanguage',keyboard);
  return {brand:text(item.brand),model:text(item.model),year:text(item.manufacture_date),serial:text(item.original_number),
    ...machineTypeAndVersion(item),inventoryNotes:text(item.notes),color:text(details.Color),
    country:own(details,'País')?text(details['País']):own(details,'País de fabricación')?text(details['País de fabricación']):oldCountry,
    keyboardLanguage:own(details,'Idioma del teclado')?text(details['Idioma del teclado']):oldLanguage,
    keyboardLayout:own(details,'Distribución del teclado')?text(details['Distribución del teclado']):oldLanguage?'':keyboard};
}
export function applyCommonFields(record,item){
  const values=commonFields(item),previous=record.inventorySource?.fields||{};
  const corrections={...record.legacySharedFields};
  if(!record.sharedInventoryVersion){
    for(const key of COMMON_FIELDS){
      const old=text(record[key]);
      // Only preserve previous cataloguer edits, not copies from old snapshots.
      if(old!==values[key] && (own(previous,key)?old!==text(previous[key]):old!==''))corrections[key]=old;
    }
    // The previous client imported serial into the collector's number field.
    // Only clear the inherited copy; a genuinely separately edited number stays.
    if(record.inventoryOriginalNumber && (own(previous,'inventoryOriginalNumber')
      ?text(record.inventoryOriginalNumber)===text(previous.inventoryOriginalNumber)
      :text(record.inventoryOriginalNumber)===values.serial))record.inventoryOriginalNumber='';
    // Older cataloguing may already have a genuine serial; preserve above for review.
  }
  record.legacySharedFields=corrections;
  Object.assign(record,values);
  record.sharedInventoryVersion=1;
  if(record.status==='Catalogada'&&(!record.brand.trim()||!record.model.trim()))record.status='En revisión';
  return values;
}
export function sharedPatch(record){
  const source=record.inventorySource;
  if(!Number.isInteger(source?.revision)||source.revision<1)throw Error('Actualizá el inventario antes de guardar esta ficha.');
  const changes={};
  for(const key of COMMON_FIELDS){
    const value=text(record[key]).trim();
    if(value!==text(source.fields?.[key]))changes[key]=value;
  }
  // Move a legacy classification out of the old version column in the same
  // atomic shared patch, retaining its actual version and country.
  if(['type','version','country'].some(key=>own(changes,key))){
    for(const key of ['type','version','country'])changes[key]=text(record[key]).trim();
  }
  // When splitting one historic combined field, persist both values explicitly.
  for(const pair of pairs)if(pair.some(key=>own(changes,key)))for(const key of pair)changes[key]=text(record[key]).trim();
  return {inventory_revision:source.revision,changes};
}
export function stripSharedFields(record){
  const payload=structuredClone(record);
  for(const key of [...COMMON_FIELDS,'type','destination'])delete payload[key];
  if(payload.inventorySource){delete payload.inventorySource.fields;delete payload.inventorySource.revision;}
  payload.sharedInventoryVersion=1;
  return payload;
}

// Rows saved by the new RPC no longer contain common fields. Hydrate them
// before parseCatalog validates mandatory fields, including on a fresh device.
export function hydrateSharedRecord(record,item){
  if(record.sharedInventoryVersion){
    if(item)Object.assign(record,commonFields(item));
    if(record.status==='Catalogada'&&(!text(record.brand).trim()||!text(record.model).trim()))record.status='En revisión';
  }
  return record;
}
