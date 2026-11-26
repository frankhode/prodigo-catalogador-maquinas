import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCatalog,saveRecord,newRecord,parseCatalog,serialize,safeImage} from '../assets/core.js';
import {readInventory,incorporateInventory,refreshFromInventory,INVENTORY_ENDPOINT} from '../assets/inventory.js';
import {inventoryPhoto} from '../assets/inventory-source.js';
const item=(extra={})=>({code:'P000019',category:'Máquinas de escribir',brand:'Olivetti',model:'Lettera 22',manufacture_date:'ca. 1950',type:'Portátil',original_number:'000123-A',photo_count:2,...extra});
test('read-only pagination uses GET exclusively and keeps complete snapshot',async()=>{
  const calls=[];const result=await readInventory(async(url,options)=>{calls.push({url,options});return Response.json(calls.length===1?{items:[item()],next:'P000019'}:{items:[],next:null});});
  assert.equal(result.length,1);assert.equal(calls.length,2);for(const c of calls){assert.equal(c.options.method,'GET');assert.equal(c.options.body,undefined);assert.equal(c.options.headers,undefined);assert.ok(c.url.startsWith(INVENTORY_ENDPOINT));}assert.match(calls[1].url,/desde=P000019/);
});
test('failed or looping pages reject before any partial import',async()=>{
  await assert.rejects(readInventory(async()=>new Response('',{status:503})),/503/);
  await assert.rejects(readInventory(async()=>Response.json({items:[item()],next:'P000019'})),/repetidos/);
  await assert.rejects(readInventory(async()=>Response.json({items:[],next:'P000001'})),/completar/);
});
test('inventory seeds machines only, preserves P code and uncertain dates, keeps ambiguous numbers separate',()=>{
  const base=emptyCatalog();const {catalog,summary}=incorporateInventory(base,[item(),item({code:'P001001',category:'Fotografía'})]);
  assert.equal(base.records.length,0);assert.equal(summary.excluded,1);const r=catalog.records[0];
  assert.equal(r.inventory,'P000019');assert.equal(r.inventoryOriginalNumber,'000123-A');assert.equal(r.serial,undefined);assert.equal(r.year,'ca. 1950');assert.equal(r.status,'Borrador');assert.equal(r.images.length,2);assert.equal(r.images[0].src,inventoryPhoto(r.inventory));assert.deepEqual(parseCatalog(serialize(catalog)),catalog);
});
test('repeat reads never duplicate and preserve dates on unchanged records',()=>{const first=incorporateInventory(emptyCatalog(),[item()]).catalog;const next=incorporateInventory(first,[item()]);assert.deepEqual(next.catalog,first);assert.equal(next.summary.unchanged,1);});
test('updates source-only fields while keeping local corrections, intentional blanks, documents and image choices',()=>{
  let c=incorporateInventory(emptyCatalog(),[item()]).catalog;const r=structuredClone(c.records[0]);r.model='Modelo corregido';r.type='';r.notes='Notas propias';r.documents=[{type:'Libro',title:'Manual'}];r.images.splice(1,1);r.primaryImageId=r.images[0].id;c=saveRecord(c,r);
  const result=incorporateInventory(c,[item({brand:'Olivetti y Cía.',model:'Modelo nuevo',type:'De escritorio',photo_count:3})]);const updated=result.catalog.records[0];assert.equal(updated.brand,'Olivetti y Cía.');assert.equal(updated.model,'Modelo corregido');assert.equal(updated.type,'');assert.equal(updated.notes,'Notas propias');assert.deepEqual(updated.documents,r.documents);assert.equal(updated.images.length,2);assert.ok(updated.images[1].id.endsWith('-3'));assert.equal(result.summary.conflicts.length,2);
  assert.deepEqual(incorporateInventory(result.catalog,[item({brand:'Olivetti y Cía.',model:'Modelo nuevo',type:'De escritorio',photo_count:3})]).catalog,result.catalog);
});
test('existing P codes are matched without replacing local nonempty fields; missing remote items are retained',()=>{
  const c=saveRecord(emptyCatalog(),{...newRecord(),inventory:'P000019',brand:'Marca catalogada',notes:'Conservar'});
  const {catalog}=incorporateInventory(c,[item()]);assert.equal(catalog.records.length,1);assert.equal(catalog.records[0].brand,'Marca catalogada');assert.equal(catalog.records[0].model,'Lettera 22');assert.equal(incorporateInventory(catalog,[]).catalog.records.length,1);
});
test('inventory source codes cannot be reassigned, remote images accept only exact public photo URLs',()=>{
  const c=incorporateInventory(emptyCatalog(),[item()]).catalog;c.records[0].inventory='P999999';assert.throws(()=>parseCatalog(c),/código P/);
  assert.ok(safeImage(inventoryPhoto('P000019',2)));for(const url of ['https://evil.com/x.jpg',INVENTORY_ENDPOINT+'?foto=P000019&imagen=9',inventoryPhoto('P000019')+'&redirect=evil',inventoryPhoto('P000019')+'#evil'])assert.equal(safeImage(url),false);
});

test('an incomplete source update cannot invalidate a catalogued machine',()=>{
  let c=incorporateInventory(emptyCatalog(),[item()]).catalog;
  c=saveRecord(c,{...c.records[0],status:'Catalogada'});
  const result=incorporateInventory(c,[item({brand:'',model:''})]);
  assert.equal(result.catalog.records[0].status,'Catalogada');assert.equal(result.catalog.records[0].brand,'Olivetti');assert.equal(result.summary.conflicts.length,2);
});

test('matching a preexisting inventory code canonicalizes case and surrounding spaces',()=>{
 const c=saveRecord(emptyCatalog(),{...newRecord(),inventory:' p000019 ',brand:'Olivetti'});
 const result=incorporateInventory(c,[item()]);assert.equal(result.catalog.records.length,1);assert.equal(result.catalog.records[0].inventory,'P000019');
});

test('fresh reads update a nonempty cached catalogue and retain catalogue corrections',async()=>{
  let c=incorporateInventory(emptyCatalog(),[item()]).catalog;
  c=saveRecord(c,{...c.records[0],model:'Modelo corregido',notes:'Trabajo local'});
  const original=serialize(c);const calls=[];
  const result=await refreshFromInventory(c,async(url,options)=>{calls.push({url,options});return Response.json({items:[item({manufacture_date:'ca. 1952'}),item({code:'P000020',brand:'Royal'})],next:null});});
  assert.equal(result.catalog.records.length,2);assert.equal(result.summary.added,1);assert.equal(result.summary.updated,1);assert.equal(result.summary.sourceCount,2);assert.ok(Number.isFinite(Date.parse(result.checkedAt)));assert.equal(result.catalog.records[0].model,'Modelo corregido');assert.equal(result.catalog.records[0].year,'ca. 1952');assert.equal(result.catalog.records[0].notes,'Trabajo local');assert.equal(serialize(c),original);assert.equal(calls[0].options.method,'GET');assert.ok(new URL(calls[0].url).searchParams.get('_'));
});
test('each recheck bypasses old responses without altering catalogue on network failure',async()=>{
  const c=incorporateInventory(emptyCatalog(),[item()]).catalog,original=serialize(c),urls=[];
  const fetch=async(url)=>{urls.push(url);return Response.json({items:[item()],next:null});};
  await refreshFromInventory(c,fetch);await refreshFromInventory(c,fetch);assert.notEqual(urls[0],urls[1]);
  await assert.rejects(refreshFromInventory(c,async()=>new Response('',{status:503})),/503/);assert.equal(serialize(c),original);
});
test('records absent from the current source are counted and retained for review',()=>{
  const c=incorporateInventory(emptyCatalog(),[item(),item({code:'P000020'})]).catalog;
  const result=incorporateInventory(c,[item()]);assert.equal(result.catalog.records.length,2);assert.equal(result.summary.sourceCount,1);assert.equal(result.summary.notPresent,1);
});

test('guided inventory fills new fields on older records and keeps edits on later reads',()=>{
  const legacy=incorporateInventory(emptyCatalog(),[item()]).catalog;
  const source=item({notes:'Comprada con funda',photo_count:0,guided_details:{fields:{
    Color:'Verde', 'Versión / país':'Italia', Teclado:'QWERTZ',
  }}});
  const catalog=incorporateInventory(legacy,[source]).catalog;
  const record=catalog.records[0];
  assert.equal(record.color,'Verde');
  assert.equal(record.country,'Italia');
  assert.equal(record.keyboardLayout,'QWERTZ');
  assert.equal(record.inventoryNotes,'Comprada con funda');
  const edited=saveRecord(catalog,{...record,color:'Gris verdoso',keyboardLayout:''});
  const updated=incorporateInventory(edited,[{...source,guided_details:{fields:{
    Color:'Azul', 'Versión / país':'Segunda serie', Teclado:'Inglés',
  }}}]).catalog.records[0];
  assert.equal(updated.color,'Gris verdoso');
  assert.equal(updated.keyboardLayout,'');
  assert.equal(updated.version,'Segunda serie');
  assert.equal(updated.keyboardLanguage,'Inglés');
  assert.equal(incorporateInventory(emptyCatalog(),[source]).catalog.records[0].images.length,0);
});
