const previousGroups = [
  {id:'identification', title:'Identificación', fields:[
    ['inventory','Identificador de inventario','text'], ['inventoryOriginalNumber','Numeración original del inventario (serie / otro número)','text'], ['pieceNumber','Nº de pieza del coleccionista','text'],
    ['brand','Marca','combo',['Underwood','Remington','Royal','Olivetti','Olympia','Smith Corona','Adler','Hermes','Brother']],
    ['model','Modelo','combo'], ['modelNotes','Comentario sobre el modelo','area'],
    ['type','Tipo','combo',['De escritorio','Portátil','Ultraportátil']],
    ['mechanism','Funcionamiento','combo',['Mecánica','Eléctrica','Electrónica']],
    ['serial','Número de serie','text'],
  ['inventoryOriginalNumber','Numeración original del inventario','text'], ['status','Estado de catalogación','select',['Borrador','En revisión','Catalogada']]
  ]},
  {id:'manufacture',title:'Fabricación y teclado',fields:[
    ['manufacturer','Fabricante','combo'], ['country','País de fabricación','combo',['Argentina','Estados Unidos','Italia','Alemania','Reino Unido','Francia','Suiza','Japón','España']],
    ['year','Año de esta máquina','text'], ['modelFrom','Modelo fabricado desde','text'], ['modelTo','Modelo fabricado hasta','text'],
    ['datingSource','Fuente / criterio de datación','area'], ['importer','Importador / distribuidor','combo'],
    ['keyboardLanguage','Idioma del teclado','combo',['Español','Inglés','Francés','Alemán','Italiano','Portugués']],
    ['keyboardLayout','Tipo de teclado','area'], ['typeface','Tipografía, tamaño y muestra de escritura','area'], ['typeCard','Naipe / muestra de caracteres','area']
  ]},
  {id:'composition',title:'Composición y detalles',fields:[
    ['color','Color','combo',['Negro','Gris','Beige','Verde','Azul','Rojo']], ['body','Cuerpo / materiales','combo'],
    ['base','Base','combo'], ['keys','Teclas / materiales','combo'], ['lid','Tapa','combo'], ['case','Funda / estuche','combo'],
    ['paint','Pintura / acabado','combo'], ['ribbon','Carrete y cinta','area'], ['manual','Manual','area'],
    ['parts','Partes y accesorios','area'], ['graphics','Gráficas, inscripciones y sellos','area'],
    ['logo','Logo y tipografía de marca','area'], ['dimensions','Dimensiones (alto × ancho × profundidad, cm)','text'], ['weight','Peso (kg)','text']
  ]},
  {id:'condition',title:'Conservación y ubicación',fields:[
    ['condition','Estado de conservación','combo',['Excelente','Bueno','Regular','Malo','Por evaluar']],
    ['working','Estado de funcionamiento','combo',['Funciona','Funciona parcialmente','No funciona','Sin probar']],
    ['completeness','Integridad / faltantes','area'], ['conditionNotes','Limpieza, daños e intervenciones','area'],
    ['location','Ubicación actual','combo'], ['destination','Destino','combo',['Museo','Tienda','Otros']],
    ['conservation','Tratamientos y recomendaciones','area']
  ]},
  {id:'history',title:'Historia y procedencia',fields:[
    ['provenance','Procedencia','area'], ['acquisition','Forma de adquisición','combo',['Compra','Donación','Canje','Préstamo','Otra']],
    ['acquisitionDate','Fecha de adquisición','text'], ['previousOwner','Propietarios anteriores','area'],
    ['history','Historia de la pieza','area'], ['trajectory','Trayectoria / exposiciones / préstamos','area']
  ]},
  {id:'documentation',title:'Documentación asociada',fields:[]},
  {id:'museography',title:'Museografía y notas',fields:[
    ['periodObjects','Objetos de época asociados','area'], ['historicalPrice','Precio de venta histórico','area'],
    ['priceContext','Equivalencia y contexto del precio (con fuente y fecha)','area'],
    ['museography','Propuesta museográfica','area'], ['art','Arte / intervenciones artísticas','area'],
    ['notes','Notas generales','area'], ['sources','Fuentes y referencias de la ficha','area']
  ]}
];
// Keep earlier data definitions for JSON compatibility; they no longer create screens.
export const operatingSystems=['Mecánico','Electromecánico','Electrónico'];
export const centralFields = [
  ['denomination','Objeto','text',['Máquina de escribir']],
  ['brand','Marca','combo',['Underwood','Remington','Royal','Olivetti','Olympia','Smith Corona','Adler','Hermes','Brother']],
  ['model','Modelo','combo'],
  ['year','Fecha','text'],
  ['serial','Número de serie','text'],
  ['version','Versión','combo',['Por determinar']],
  ['mechanism','Sistema de funcionamiento','fixed',operatingSystems],
  ['color','Color','combo',['Negro','Gris','Beige','Verde','Azul','Rojo']],
  ['country','País de fabricación','combo',['Argentina','Estados Unidos','Italia','Alemania','Reino Unido','Francia','Suiza','Japón','España']],
  ['keyboardLanguage','Idioma del teclado','combo',['Español','Inglés','Francés','Alemán','Italiano','Portugués']],
  ['type','Tipo','combo',['Portátil','Escritorio','Ultraportátil']],
  ['destination','Destino','destination',['Museo','Tienda','Otros']],
  ['inventoryNotes','Notas','area']
];
const centralKeys=new Set(centralFields.map(([key])=>key));
export const legacyFields=previousGroups.flatMap(g=>g.fields).filter(([key])=>!centralKeys.has(key));
export const fields=[...centralFields,...legacyFields,['collection','Colección','combo',['Patrimonio mecanográfico']],...[["designer","Diseñador","combo"],["productionQuantity","Cantidad producida","combo"],["patents","Patentes","combo"],["materials","Materiales","combo"],["components","Componentes","combo"],["accessories","Accesorios","combo"],["documentType","Tipo documental","combo"],["documentTitle","Título o denominación","combo"],["documentAuthor","Autor / entidad responsable","combo"],["documentDate","Fecha","combo"],["documentLanguage","Idioma","combo"],["documentExtent","Extensión","combo"],["documentNotes","Notas","combo"]]];
export const fieldMap = new Map(fields.map(f=>[f[0],f]));
export const documentTypes=['Libro','Publicidad','Efímera','Garantía','Factura de compra','Diploma','Fotografía de época','Postal','Manual','Otro'];
export const documentFields=[['type','Tipo de documento','select',documentTypes],['title','Título / descripción','text'],['date','Fecha','text'],['reference','Referencia / ubicación / enlace','text'],['notes','Notas','area']];
export const imageViews=['General','Frente','Reverso','Lateral','Detalle','Número de serie','Teclado','Documentación','Otro'];
export const requiredFields=['brand','model'];
export const bulkFields=['brand','model','version','year','color','keyboardLanguage','country','collection','type'];

export const manufactureFields=['manufacturer','designer','modelFrom','modelTo','productionQuantity','patents','dimensions','weight','keyboardLayout','materials','paint','components','accessories','datingSource','collection','body','base','keys','lid','case','ribbon','parts','typeface','typeCard'].map(k=>fieldMap.get(k));
export const standaloneDocumentFields=['inventory','documentType','documentTitle','documentAuthor','documentDate','documentLanguage','documentExtent','documentNotes'].map(k=>fieldMap.get(k));

const proposedGroups=[null,null,[["importer","Importador"],["representative","Representante"],["distributor","Distribuidor"],["dealer","Concesionario"],["retailer","Establecimiento comercial"],["historicalPrice","Precio histórico"],["priceCurrency","Moneda"],["priceDate","Fecha del precio"],["financing","Financiación"],["warranty","Garantía"],["technicalService","Servicio técnico"],["relatedAdvertising","Publicidad relacionada"]],[["previousOwner","Propietarios anteriores"],["users","Usuarios"],["usePlaces","Lugares de utilización"],["useFunction","Actividad o función"],["events","Acontecimientos"],["moves","Traslados"],["graphics","Inscripciones y sellos"],["testimonials","Testimonios"],["acquisitionDate","Fecha de adquisición"],["acquisition","Modalidad de adquisición"],["acquisitionPrice","Precio de adquisición"],["history","Historia objetual"]],null,[["condition","Estado general"],["componentCondition","Estado por componente"],["originality","Originalidad"],["completeness","Integridad"],["working","Funcionamiento"],["missingParts","Faltantes"],["deterioration","Deterioros"],["alterations","Alteraciones"],["repairs","Reparaciones"],["restorations","Restauraciones"],["conservation","Intervenciones futuras"],["technicalPhotos","Registro fotográfico técnico"],["location","Ubicación física"]],[["artPhoto","Fotografía artística"],["photoAuthor","Autor de la fotografía"],["historicalContext","Contexto histórico"],["socialContext","Contexto social"],["relatedPeople","Personajes relacionados"],["associatedObjects","Objetos asociados"],["periodObjects","Mobiliario de época"],["periodMoney","Monedas y billetes"],["museography","Guion museográfico"],["trajectory","Exposiciones"],["heritageValue","Valoración patrimonial"],["educationalMaterial","Material educativo"]],[["ownership","Titularidad"],["valuation","Tasación económica"],["catalogingDate","Fecha de catalogación"],["cataloger","Responsable de catalogación"],["sources","Fuentes de información"],["certainty","Grado de certeza"],["reviewer","Revisor"],["validationUpdateDate","Fecha de actualización"],["publicationStatus","Estado de publicación"],["reproductionRights","Derechos de reproducción"]]];
export const optionalFields=proposedGroups.map(group=>group?.map(([key,label])=>{const old=fieldMap.get(key);const def=[key,label,old?.[2]||'combo',old?.[3]||[]];if(!old){fields.push(def);fieldMap.set(key,def);}return def;})||[]);
export const observationFields=Array.from({length:8},(_,i)=>['observations'+(i+1),'Observaciones / anotaciones','area']);
for(const def of observationFields){fields.push(def);fieldMap.set(def[0],def);}
