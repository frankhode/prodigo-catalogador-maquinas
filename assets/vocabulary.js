import {fields,documentFields,imageViews} from './schema.js?v=1.4.2';
export const termKey=value=>String(value??'').trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export function uniqueTerms(values){
  const seen=new Set();return values.filter(value=>{if(typeof value!=='string'||!value.trim())return false;const key=termKey(value);if(seen.has(key))return false;seen.add(key);return true;}).map(value=>value.trim());
}
const definitions=new Map([...fields,...documentFields.map(([key,...rest])=>[`document.${key}`,...rest]),['image.view','Vista','combo',imageViews],['image.caption','Descripción','text']].map(f=>[f[0],f]));
export function recordTerms(record){
  return [...fields.filter(([key])=>!key.startsWith('observations')).map(([key])=>[key,record[key]]),...(record.documents||[]).flatMap(d=>documentFields.map(([key])=>[`document.${key}`,d[key]])),...(record.images||[]).flatMap(im=>[['image.view',im.view],['image.caption',im.caption]])];
}
export function rememberRecordTerms(catalog,record){
  for(const [key,value] of recordTerms(record))if(typeof value==='string'&&value.trim())catalog.vocabularies[key]=uniqueTerms([...(catalog.vocabularies[key]||[]),value]);
}
export function vocabularyFor(catalog,key,draft=null){
  return uniqueTerms([...(definitions.get(key)?.[3]||[]),...(catalog.vocabularies[key]||[]),...catalog.records.flatMap(record=>recordTerms(record).filter(([k])=>k===key).map(([,v])=>v)),...(draft?recordTerms(draft).filter(([k])=>k===key).map(([,v])=>v):[])]).sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
}
export function matchingTerms(options,query){const words=termKey(query).split(' ').filter(Boolean);return options.filter(value=>words.every(word=>termKey(value).includes(word)));}
