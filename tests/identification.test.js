import test from 'node:test';
import assert from 'node:assert/strict';
import {identificationDraft,emptyCatalog,newRecord,saveRecord,parseCatalog,serialize} from '../assets/core.js';
import {incorporateInventory} from '../assets/inventory.js';
import {vocabularyFor} from '../assets/vocabulary.js';

test('editing central identification round-trips earlier fields, documents, primary photo and P code',()=>{
  const old={...newRecord(),inventory:'P000019',brand:'Underwood',model:'Nº 5',serial:'000914655',year:'ca. 1916',provenance:'Familia original',conditionNotes:'Limpieza pendiente',documents:[{type:'Manual',title:'Original'}],images:[{id:'first',src:'data:image/webp;base64,AAAA'},{id:'main',src:'data:image/webp;base64,BBBB'}],primaryImageId:'main',inventorySource:{system:'prodigo-inventario',code:'P000019',fields:{brand:'Underwood',model:'Nº 5',year:'1916'}}};
  delete old.denomination;
  const original=structuredClone(old),draft=identificationDraft(old);
  assert.equal(draft.denomination,'Máquina de escribir');
  Object.assign(draft,{version:'Segunda serie',collection:'Colección de estudio',color:'Negro',keyboardLanguage:'Español',country:'Estados Unidos'});
  const catalog=parseCatalog(serialize(saveRecord(emptyCatalog(),draft)));
  const saved=catalog.records[0];
  for(const key of ['inventory','serial','year','provenance','conditionNotes','documents','images','primaryImageId','inventorySource'])assert.deepEqual(saved[key],original[key],key);
  assert.deepEqual(old,original);
  const refreshed=incorporateInventory(catalog,[{code:'P000019',category:'Máquina de escribir',brand:'Underwood',model:'Nº 5',manufacture_date:'1917',photo_count:1}]).catalog;
  for(const key of ['denomination','version','collection','serial','color','keyboardLanguage','country','provenance','documents','primaryImageId'])assert.deepEqual(refreshed.records[0][key],saved[key],key);
  for(const key of ['denomination','version','collection'])assert.ok(vocabularyFor(refreshed,key).includes(saved[key]),key);
});

test('an intentionally blank denomination remains blank and new text fields reject incompatible JSON',()=>{
  assert.equal(identificationDraft({...newRecord(),denomination:''}).denomination,'');
  for(const key of ['denomination','version','collection']){
    const catalog=emptyCatalog();catalog.records=[{...newRecord(),[key]:{invalid:true}}];
    assert.throws(()=>parseCatalog(catalog),/debe contener texto/);
  }
});

import {centralFields,manufactureFields} from '../assets/schema.js';
test('la página inicial replica exactamente los campos de inventario',()=>{
 assert.deepEqual(centralFields.map(f=>f[0]),['denomination','brand','model','year','serial','version','mechanism','color','country','keyboardLanguage','type','destination','inventoryNotes']);
 assert.ok(!manufactureFields.some(f=>centralFields.some(c=>c[0]===f[0])));
});
