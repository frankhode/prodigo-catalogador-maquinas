// Shared Supabase session, same project and origin as the inventory app.
const URL='https://wgtircsltokentekqgdq.supabase.co';
const KEY='sb_publishable_IiOilYnrWkqTHhvZSLeU_w_F2WS54gi';
let connection;
async function client(){
  connection??=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm')
    .then(({createClient})=>createClient(URL,KEY))
    .catch(error=>{connection=undefined;throw error;});
  const supabase=await connection;
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw Error('Ingresá primero en la app de inventario con tu usuario de Pródigo y volvé a intentar.');
  return supabase;
}
function check(result){if(result.error)throw Error(result.error.message);return result.data;}
export async function readMachineInventory({allDestinations=false}={}){
  const c=await client(),items=[];
  for(let offset=0;;offset+=200){
    let query=c.from('inventory_items').select('code,category,brand,model,manufacture_date,type,original_number,notes,photo_path,extra_photos,guided_details,revision,destination');
    if(!allDestinations)query=query.eq('destination','museo');
    const page=check(await query.order('code').range(offset,offset+199));
    items.push(...page.map(({photo_path,extra_photos,...item})=>({
      ...item,photo_count:photo_path ? 1+(extra_photos?.length||0) : 0,
    })));
    if(page.length<200)return items;
  }
}
export async function readShared(){
  const c=await client(),rows=[];
  for(let offset=0;;offset+=200){
    const page=check(await c.from('machine_catalog_records').select('inventory_code,payload,revision').order('inventory_code').range(offset,offset+199));
    rows.push(...page);if(page.length<200)return rows;
  }
}
export async function writeShared(records){
  const c=await client();
  if(records.length>500)throw Error('El lote supera 500 fichas. Dividí la migración.');
  const result=await c.rpc('save_machine_catalog_shared',{p_records:records});
  if(result.error?.code==='PGRST202')throw Error('Falta activar la migración 202611260002 en Supabase. Los cambios todavía no se guardaron.');
  return check(result);
}
