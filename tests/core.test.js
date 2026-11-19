import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCatalog,newRecord,saveRecord,parseCatalog,serialize,filterRecords,mergeCatalogs,validateRecord,safeImage} from '../assets/core.js';
const machine=(c=emptyCatalog(),extra={})=>({...newRecord(c.records),brand:'Olivetti',model:'Lettera 22',...extra});
test('JSON round trip preserves unknown fields, documents, images and identifiers',()=>{
  const r=machine(undefined,{inventory:'P000019',serial:'001234',extra:{future:true},documents:[{type:'Garantía',title:'Original',notes:'Sí'}],images:[{id:'im1',src:'data:image/webp;base64,AAAA',thumb:'data:image/webp;base64,AAAA',name:'a.webp'}],primaryImageId:'im1'});
  const c=saveRecord(emptyCatalog(),r);assert.deepEqual(parseCatalog(serialize(c)),c);assert.equal(c.records[0].serial,'001234');
});
test('new record IDs never duplicate or depend on inventory identifiers',()=>{const c=saveRecord(emptyCatalog(),machine());assert.equal(newRecord(c.records).id,'M000002');});
test('saving is immutable and learns custom vocabulary',()=>{const c=emptyCatalog();const next=saveRecord(c,machine(undefined,{brand:'Marca propia'}));assert.equal(c.records.length,0);assert.deepEqual(next.vocabularies.brand,['Marca propia']);});
test('inventory duplicate checks normalize case, accents and spaces',()=>{const c=saveRecord(emptyCatalog(),machine(undefined,{inventory:' P000001 '}));assert.throws(()=>saveRecord(c,machine(c,{inventory:'p000001'})),/ya está asignado/);});
test('drafts may be incomplete; catalogued records require brand and model',()=>{assert.doesNotThrow(()=>validateRecord(newRecord()));assert.throws(()=>validateRecord({...newRecord(),status:'Catalogada'}),/marca y modelo/);});
test('date ranges are checked without forcing uncertain dates into integers',()=>{assert.throws(()=>validateRecord(machine(undefined,{modelFrom:'1933',modelTo:'1900'})),/posterior/);assert.doesNotThrow(()=>validateRecord(machine(undefined,{year:'ca. 1916'})));});
test('search covers notes and documents, ignores diacritics, supports pending fields',()=>{const r=machine(undefined,{notes:'Procedencia Córdoba',documents:[{title:'Garantía'}]});const other=machine(undefined,{id:'M000002',brand:'Royal',inventory:'P000002'});assert.equal(filterRecords([r,other],{q:'cordoba garantia',pending:'inventory'}).length,1);assert.equal(filterRecords([r,other],{brand:'Royal',pending:'inventory'}).length,0);});
test('merge rejects ID or inventory collisions without modifying originals',()=>{const a=saveRecord(emptyCatalog(),machine());assert.throws(()=>mergeCatalogs(a,a),/ya existentes/);const b=saveRecord(emptyCatalog(),machine(undefined,{id:'M000005'}));assert.equal(mergeCatalogs(a,b).records.length,2);assert.equal(a.records.length,1);});
test('imports reject incompatible data, duplicate image IDs and unsafe images',()=>{assert.throws(()=>parseCatalog({records:[]}),/compatible/);const c=saveRecord(emptyCatalog(),machine());c.records.push(structuredClone(c.records[0]));assert.throws(()=>parseCatalog(c),/repetidos/);assert.equal(safeImage('https://example.com/a.jpg'),false);assert.equal(safeImage('data:image/svg+xml;base64,AAAA'),false);});
