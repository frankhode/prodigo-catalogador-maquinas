export async function loadImage(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(Error('No se pudo leer la imagen. Usá JPG, PNG o WebP.'));img.src=src;});}
function encode(img,max,quality=.82){const ratio=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/webp',quality);}
export async function prepareImage(file){
  if(!/\.(jpe?g|png|webp)$/i.test(file.name))throw Error(`${file.name}: formato no admitido. Usá JPG, PNG o WebP.`);
  if(file.size>40*1024*1024)throw Error(`${file.name}: la imagen supera 40 MB. Prepará una copia más pequeña.`);
  const url=URL.createObjectURL(file);try{const img=await loadImage(url);return {id:crypto.randomUUID(),name:file.name,view:'General',caption:'',src:encode(img,1600),thumb:encode(img,320,.75)};}finally{URL.revokeObjectURL(url);}
}
export async function rotateImage(image){const img=await loadImage(image.src),c=document.createElement('canvas');c.width=img.height;c.height=img.width;const ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(img,0,0);return {...image,src:c.toDataURL('image/webp',.9),thumb:encode(c,320,.75)};}
