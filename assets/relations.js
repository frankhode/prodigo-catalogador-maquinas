import {normalize,safeImage,title} from './core.js?v=1.6.1';
import {inventoryPhoto} from './inventory-source.js?v=1.5.4';

// Index descriptive values, including nested guided details and catalogue documentation.
// Do not index binary images, URLs, private storage paths or technical image identifiers.
const hiddenKeys=new Set(['src','thumb','photo_path','extra_photos','photo_crop','primaryImageId']);
function searchable(value,key=''){
  if(hiddenKeys.has(key))return '';
  if(Array.isArray(value))return value.map(v=>searchable(v)).join(' ');
  if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>hiddenKeys.has(k)?'':searchable(v,k)).join(' ');
  return typeof value==='string'||typeof value==='number'||typeof value==='boolean'?String(value):'';
}
function guidedTitle(item){
  const f=item.guided_details?.fields||{};
  return f['Título']||f['Título o descripción']||f['Nombre del objeto']||f['Tema o retratado']||f['Lugar o tema']||f['Título o tema']||f['Producto o servicio']||f['Tema']||'';
}
function inventoryLabel(item){
  return [...new Set([item.code,item.category,item.brand,item.model,guidedTitle(item),item.type].filter(Boolean))].join(' · ');
}
function sourcePhoto(item){
  return item&&item.photo_count!==0&&/^P\d{6}$/.test(item.code)?inventoryPhoto(item.code):'';
}
function localPhoto(record){
  const images=record.images||[],primary=images.find(im=>im.id===record.primaryImageId)||images[0];
  return [primary?.thumb,primary?.src].find(safeImage)||'';
}
export function relationCandidates(records,items,draft){
  const byCode=new Map(items.map(item=>[item.code,item]));
  const localCodes=new Set(records.map(r=>r.inventory).filter(Boolean));
  const candidates=[];
  for(const r of records){
    if(r.id===draft.id||draft.inventory&&r.inventory===draft.inventory)continue;
    const item=byCode.get(r.inventory);
    candidates.push({
      id:r.id,type:r.documentType||item?.category||'Documento relacionado',
      label:[r.inventory||r.id,r.documentTitle||title(r)].join(' · '),
      detail:[r.documentType||item?.category,r.year||item?.manufacture_date,r.serial||item?.original_number].filter(Boolean).join(' · '),
      photo:localPhoto(r)||sourcePhoto(item),
      haystack:normalize([searchable(r),searchable(item)].join(' ')),
    });
  }
  for(const item of items){
    if(item.code===draft.inventory||localCodes.has(item.code))continue;
    candidates.push({
      id:item.code,type:item.category||'Documento relacionado',
      label:inventoryLabel(item),
      detail:[item.manufacture_date,item.original_number].filter(Boolean).join(' · '),
      photo:sourcePhoto(item),haystack:normalize(searchable(item)),
    });
  }
  return candidates;
}
export function searchRelations(candidates,query){
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  return candidates.filter(c=>terms.every(t=>c.haystack.includes(t)));
}
