import test from 'node:test';
import assert from 'node:assert/strict';
import {relationCandidates,searchRelations} from '../assets/relations.js';
import {inventoryPhoto} from '../assets/inventory-source.js';

const draft={id:'M1',inventory:'P000001'};
const records=[
  draft,
  {id:'M2',inventory:'P000002',brand:'Olivetti',model:'Lettera',notes:'Procedencia Córdoba',documents:[{title:'Garantía'}],primaryImageId:'b',images:[{id:'a',src:inventoryPhoto('P000002')},{id:'b',src:inventoryPhoto('P000002',2),caption:'Teclado alemán'}]},
  {id:'M3',recordKind:'document',documentTitle:'Manual de uso',images:[]}
];
const items=[
  {code:'P000001',category:'Máquina',photo_count:1},
  {code:'P000002',category:'Máquina',original_number:'S-123',guided_details:{fields:{Color:'Gris metálico'}}},
  {code:'P000003',category:'Fotografía',notes:'Estación Retiro',guided_details:{fields:{Autor:'José Bixio','Tema o retratado':'Estación Retiro'}},photo_count:1},
  {code:'P000004',category:'Manual',notes:'Sin imagen',photo_count:0},
];
test('related lookup merges inventory and local records, excludes self and deduplicates codes',()=>{
  const candidates=relationCandidates(records,items,draft);
  assert.deepEqual(candidates.map(c=>c.id),['M2','M3','P000003','P000004']);
  for(const query of ['cordoba garantia','gris metalico s-123','teclado aleman','P000002','M2'])assert.deepEqual(searchRelations(candidates,query).map(c=>c.id),['M2']);
  assert.deepEqual(searchRelations(candidates,'bixio retiro').map(c=>c.id),['P000003']);
  assert.match(candidates[2].label,/Estación Retiro/);
  assert.deepEqual(searchRelations(candidates,'manual').map(c=>c.id),['M3','P000004']);
  assert.equal(searchRelations(candidates,'https://').length,0);
  assert.equal(searchRelations(candidates,'   ').length,4);
});
test('related photos use the primary local image or inventory cover, with no-photo fallback',()=>{
  const candidates=relationCandidates(records,items,draft);
  assert.deepEqual(candidates.map(c=>c.photo),[inventoryPhoto('P000002',2),'',inventoryPhoto('P000003'),'']);
  assert.equal(relationCandidates([{id:'M2',inventory:'P000002',images:[]}],items,draft)[0].photo,inventoryPhoto('P000002'));
});
