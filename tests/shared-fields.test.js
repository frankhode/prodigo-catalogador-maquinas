import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCatalog,saveRecord} from '../assets/core.js';
import {incorporateInventory} from '../assets/inventory.js';
import {commonFields,sharedPatch,stripSharedFields,hydrateSharedRecord} from '../assets/shared-fields.js';
const item=(extra={})=>({code:'P000001',category:'Máquina de escribir',brand:'Underwood',model:'3 bank',manufacture_date:'1926',type:'Primera serie',original_number:'00151729',notes:'Nota de inventario',photo_count:0,guided_details:null,revision:1,...extra});
test('identificación compartida: el número se lee como serie, no como número del coleccionista',()=>{
  const {catalog}=incorporateInventory(emptyCatalog(),[item()]);
  const record=catalog.records[0];
  assert.equal(record.serial,'00151729');
  assert.ok(!record.inventoryOriginalNumber);
  assert.equal(record.inventoryNotes,'Nota de inventario');
  assert.deepEqual(sharedPatch(record),{inventory_revision:1,changes:{}});
});
test('una modificación desde inventario se refleja incluso si había campos duplicados en la ficha M',()=>{
  const c=incorporateInventory(emptyCatalog(),[item()]).catalog;
  const next=incorporateInventory(c,[item({brand:'Marca nueva',manufacture_date:'',revision:2})]).catalog.records[0];
  assert.equal(next.brand,'Marca nueva');assert.equal(next.year,'');
  assert.equal(next.inventorySource.revision,2);
  assert.deepEqual(sharedPatch(next),{inventory_revision:2,changes:{}});
});
test('migración conserva correcciones antiguas y separa el número original aportado manualmente',()=>{
  const old=incorporateInventory(emptyCatalog(),[{...item(),revision:undefined}]).catalog;
  const edited=saveRecord(old,{...old.records[0],brand:'Underwood corregido',serial:'000222',inventoryOriginalNumber:'Número coleccionista'});
  const fresh=incorporateInventory(edited,[item()]).catalog.records[0];
  assert.equal(fresh.brand,'Underwood');assert.equal(fresh.serial,'00151729');
  assert.equal(fresh.inventoryOriginalNumber,'Número coleccionista');
  assert.deepEqual(fresh.legacySharedFields,{brand:'Underwood corregido',serial:'000222'});
  const copied=incorporateInventory(old,[item()]).catalog.records[0];
  assert.equal(copied.inventoryOriginalNumber,'');
  assert.deepEqual(copied.legacySharedFields,{});
});
test('catalogar envía sólo campos comunes modificados y separa definitivamente los campos combinados',()=>{
  const i=item({guided_details:{group:'Oficina',fields:{Color:'Verde','Versión / país':'Italia',Teclado:'QWERTZ'}}});
  const r=incorporateInventory(emptyCatalog(),[i]).catalog.records[0];
  assert.equal(r.country,'Italia');assert.equal(r.keyboardLayout,'QWERTZ');
  const edited={...r,version:'Segunda serie',keyboardLanguage:'Alemán',serial:'',notes:'Nota de catalogación',collection:'Colección'};
  assert.deepEqual(sharedPatch(edited),{inventory_revision:1,changes:{serial:'',version:'Segunda serie',country:'Italia',keyboardLanguage:'Alemán',keyboardLayout:'QWERTZ'}});
  const payload=stripSharedFields(edited);
  assert.equal(payload.inventory,'P000001');assert.equal(payload.collection,'Colección');assert.equal(payload.notes,'Nota de catalogación');
  assert.ok(!('serial' in payload));assert.ok(!('fields' in payload.inventorySource));assert.ok(!('revision' in payload.inventorySource));
  assert.equal(edited.serial,'');
});
test('si el inventario vacía un dato obligatorio, la ficha pasa a revisión sin resucitar valores viejos',()=>{
  const c=incorporateInventory(emptyCatalog(),[item()]).catalog;
  const saved=saveRecord(c,{...c.records[0],status:'Catalogada'});
  const record=incorporateInventory(saved,[item({brand:'',model:'',revision:2})]).catalog.records[0];
  assert.equal(record.status,'En revisión');assert.equal(record.brand,'');
});
test('los datos detallados canónicos ganan sobre los campos combinados históricos, incluso un vacío explícito',()=>{
 const r=commonFields(item({type:'Exportación',guided_details:{fields:{'Versión / país':'Italia','País':'','Teclado':'Inglés','Idioma del teclado':'','Distribución del teclado':'QWERTY'}}}));
 assert.equal(r.country,'');assert.equal(r.version,'Exportación');assert.equal(r.keyboardLanguage,'');assert.equal(r.keyboardLayout,'QWERTY');
});

test('un dispositivo nuevo puede cargar una ficha catalogada que ya no duplica los campos comunes',()=>{
  const c=incorporateInventory(emptyCatalog(),[item()]).catalog;
  const record={...c.records[0],status:'Catalogada'};
  const payload=stripSharedFields(record);
  const fresh=hydrateSharedRecord(payload,item({brand:'Underwood actualizada',revision:9}));
  assert.equal(fresh.brand,'Underwood actualizada');assert.equal(fresh.model,'3 bank');
  const restored=incorporateInventory({...emptyCatalog(),records:[fresh]},[item({brand:'Underwood actualizada',revision:9})]).catalog.records[0];
  assert.equal(restored.status,'Catalogada');assert.equal(restored.inventorySource.revision,9);
});
