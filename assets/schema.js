export const groups = [
  {id:'identification', title:'Identificación', fields:[
    ['inventory','Identificador de inventario','text'], ['pieceNumber','Nº de pieza del coleccionista','text'],
    ['brand','Marca','combo',['Underwood','Remington','Royal','Olivetti','Olympia','Smith Corona','Adler','Hermes','Brother']],
    ['model','Modelo','combo'], ['modelNotes','Comentario sobre el modelo','area'],
    ['type','Tipo','combo',['De escritorio','Portátil','Ultraportátil']],
    ['mechanism','Funcionamiento','combo',['Mecánica','Eléctrica','Electrónica']],
    ['serial','Número de serie','text'], ['status','Estado de catalogación','select',['Borrador','En revisión','Catalogada']]
  ]},
  {id:'manufacture',title:'Fabricación y teclado',fields:[
    ['manufacturer','Fabricante','combo'], ['country','País de fabricación','combo',['Argentina','Estados Unidos','Italia','Alemania','Reino Unido','Francia','Suiza','Japón','España']],
    ['year','Año de esta máquina','text'], ['modelFrom','Modelo fabricado desde','text'], ['modelTo','Modelo fabricado hasta','text'],
    ['datingSource','Fuente / criterio de datación','area'], ['importer','Importador / distribuidor','combo'],
    ['keyboardLanguage','Idioma del teclado','combo',['Español','Inglés','Francés','Alemán','Italiano','Portugués']],
    ['keyboardLayout','Distribución y particularidades del teclado','area'], ['typeface','Tipografía, tamaño y muestra de escritura','area'], ['typeCard','Naipe / muestra de caracteres','area']
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
export const fields = groups.flatMap(g=>g.fields);
export const fieldMap = new Map(fields.map(f=>[f[0],f]));
export const documentTypes=['Libro','Publicidad','Efímera','Garantía','Factura de compra','Diploma','Fotografía de época','Postal','Manual','Otro'];
export const imageViews=['General','Frente','Reverso','Lateral','Detalle','Número de serie','Teclado','Documentación','Otro'];
export const requiredFields=['brand','model'];
export const bulkFields=['brand','model','manufacturer','country','type','mechanism','color','keyboardLanguage','condition','working','location','destination','status'];
