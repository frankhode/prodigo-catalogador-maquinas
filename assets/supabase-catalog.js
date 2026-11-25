// Shared Supabase session, same project and origin as the inventory app.
const URL='https://wgtircsltokentekqgdq.supabase.co';
const KEY='sb_publishable_IiOilYnrWkqTHhvZSLeU_w_F2WS54gi';
let connection;
async function client(){
  if(!connection){const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');connection=createClient(URL,KEY);}
  const {data,error}=await connection.auth.getUser();
  if(error||!data.user)throw Error('Ingresá primero en la app de inventario con tu usuario de Pródigo y volvé a intentar.');
  return connection;
}
function check(result){if(result.error)throw Error(result.error.message);return result.data;}
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
  return check(await c.rpc('save_machine_catalog_records',{p_records:records}));
}
