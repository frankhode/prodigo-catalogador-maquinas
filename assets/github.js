import {parseCatalog,serialize} from './core.js';
export const REPO='frankhode/prodigo-catalogador-maquinas';
export const PATH='data/catalogo.json';
const endpoint=`https://api.github.com/repos/${REPO}/contents/${PATH}`;
let token='';
export function connected(){return Boolean(token);}
export function disconnect(){token='';}
async function request(url,init={}){
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),...init,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`} : {}),...init.headers}});
  if(!response.ok){if(response.status===409||response.status===422)throw Error('GitHub cambió desde la última lectura. Exportá tu JSON y leé la versión de GitHub antes de volver a guardar.');if(response.status===401||response.status===403)throw Error('GitHub rechazó el acceso. Revisá el token y el permiso Contents: Read and write.');throw Error(`No se pudo completar la operación con GitHub (${response.status}).`);}
  return response.json();
}
export async function connect(value){token=value.trim();try{await request(`https://api.github.com/repos/${REPO}`);}catch(e){disconnect();throw e;}}
export async function readRemote(){
  const f=await request(`${endpoint}?ref=main&t=${Date.now()}`);
  if(f.size>20*1024*1024)throw Error('El catálogo online supera 20 MB. Usá un respaldo local.');
  let text;
  if(f.content){const bytes=Uint8Array.from(atob(f.content.replace(/\s/g,'')),x=>x.charCodeAt(0));text=new TextDecoder().decode(bytes);}
  else {const response=await fetch(`${endpoint}?ref=main&t=${Date.now()}`,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github.raw+json',...(token?{Authorization:`Bearer ${token}`} : {})}});if(!response.ok)throw Error('No se pudo leer el JSON completo de GitHub.');text=await response.text();const verify=await request(`${endpoint}?ref=main&t=${Date.now()}`);if(verify.sha!==f.sha)throw Error('El catálogo cambió durante la lectura. Volvé a leer GitHub.');}
  return {catalog:parseCatalog(text),sha:f.sha};
}
export async function writeRemote(catalog,sha){
  if(!connected())throw Error('Conectá GitHub antes de guardar.');
  if(!sha){const base=await readRemote();if(base.catalog.records.length)throw Error('GitHub ya contiene fichas. Exportá tu JSON local, leé GitHub e importá tu respaldo para agregar o reemplazar antes de guardar.');sha=base.sha;}
  const current=await request(`${endpoint}?ref=main&t=${Date.now()}`);
  if(current.sha!==sha)throw Error('Otra sesión modificó el catálogo de GitHub. Tu copia local está a salvo. Exportá el JSON antes de leer la nueva versión.');
  const bytes=new TextEncoder().encode(serialize(catalog));
  if(bytes.length>20*1024*1024)throw Error('El JSON supera 20 MB. Descargá un respaldo local. Para catálogos mayores será necesario separar las imágenes del JSON.');
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const result=await request(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Actualizar catálogo de máquinas (${catalog.records.length} fichas)`,branch:'main',sha,content:btoa(binary)})});
  return result.content.sha;
}
