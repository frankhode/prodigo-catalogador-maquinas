import test from 'node:test';import assert from 'node:assert/strict';
import {vocabularyFor,matchingTerms,uniqueTerms} from '../assets/vocabulary.js';
import {emptyCatalog,newRecord,saveRecord,parseCatalog,serialize} from '../assets/core.js';
import {fields,documentFields} from '../assets/schema.js';
test('every catalogue and document field remembers values, including long text and original zeroes',()=>{
 const r={...newRecord(),...Object.fromEntries(fields.map(([key])=>[key,key==='inventory'?'P000001':key==='status'?'Estado propio':`Valor ${key}`])),serial:'000012-A',notes:'Párrafo primero\nPárrafo segundo',documents:[Object.fromEntries(documentFields.map(([key])=>[key,`Documento ${key}`]))]};
 const c=saveRecord(emptyCatalog(),r);for(const [key] of fields)assert.ok(vocabularyFor(c,key).includes(r[key]),key);for(const [key] of documentFields)assert.ok(vocabularyFor(c,`document.${key}`).includes(r.documents[0][key]),key);assert.equal(c.records[0].serial,'000012-A');assert.deepEqual(parseCatalog(serialize(c)),c);
});
test('lists bootstrap from older records, stay isolated, and include values from the current draft',()=>{
 const c=emptyCatalog();c.records=[{...newRecord(),country:'Suiza',provenance:'Archivo familiar',documents:[{type:'Publicidad',notes:'Nota del documento'}],images:[]}];
 assert.ok(vocabularyFor(c,'provenance').includes('Archivo familiar'));assert.ok(vocabularyFor(c,'document.notes').includes('Nota del documento'));assert.ok(!vocabularyFor(c,'notes').includes('Nota del documento'));assert.ok(vocabularyFor(c,'location',{...newRecord(),location:'Depósito norte'}).includes('Depósito norte'));assert.deepEqual(c.vocabularies,{});
});
test('all lists deduplicate case, accents and whitespace without altering entered records',()=>{
 const c=emptyCatalog();c.vocabularies.provenance=['Córdoba'];const next=saveRecord(c,{...newRecord(),provenance:'  CORDOBA  '});assert.deepEqual(next.vocabularies.provenance,['Córdoba']);assert.equal(next.records[0].provenance,'  CORDOBA  ');assert.deepEqual(uniqueTerms(['',' ','Córdoba','CORDOBA','Buenos  Aires','Buenos Aires']),['Córdoba','Buenos  Aires']);
});
test('filtering supports accented, case-insensitive partial words and preserves zeroes',()=>{assert.deepEqual(matchingTerms(['Córdoba, Argentina','Buenos Aires','000012-A'],'CORD arG'),['Córdoba, Argentina']);assert.deepEqual(matchingTerms(['000012-A','0012-A'],'000012'),['000012-A']);});
test('image metadata has independent reusable lists and saved options survive later editing',()=>{
 let c=saveRecord(emptyCatalog(),{...newRecord(),images:[{id:'im1',src:'data:image/webp;base64,AAAA',view:'Rodillo',caption:'Detalle del teclado'}]});assert.ok(vocabularyFor(c,'image.view').includes('Rodillo'));assert.ok(vocabularyFor(c,'image.caption').includes('Detalle del teclado'));c=saveRecord(c,{...c.records[0],images:[]});assert.ok(vocabularyFor(c,'image.view').includes('Rodillo'));
});
