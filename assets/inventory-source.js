// Public endpoint already used by Pródigo. No credentials and no write API.
export const INVENTORY_ENDPOINT='https://wgtircsltokentekqgdq.supabase.co/functions/v1/museum-catalog';
export function inventoryPhoto(code,index=1){
  if(!/^P\d{6}$/.test(code)||!Number.isInteger(index)||index<1||index>8)throw Error('Referencia de foto de inventario inválida.');
  return `${INVENTORY_ENDPOINT}?foto=${code}${index>1?`&imagen=${index}`:''}`;
}
export function safeInventoryImage(value){
  if(typeof value!=='string')return false;
  try{const url=new URL(value);const code=url.searchParams.get('foto');const index=Number(url.searchParams.get('imagen')||1);return value===inventoryPhoto(code,index);}catch{return false;}
}
