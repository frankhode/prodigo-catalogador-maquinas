# Pródigo · Catalogador de máquinas de escribir

Aplicación independiente para catalogar las máquinas de la colección. Funciona en el navegador, sin XAMPP, instalaciones de paquetes ni base de datos. Las fichas, listas y vistas de imágenes se conservan en JSON.

## Abrir la aplicación

En este repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → main → / (root) → Save**.

Dirección, una vez habilitado Pages: **https://frankhode.github.io/prodigo-catalogador-maquinas/**

Para uso local: descargar el repositorio y ejecutar `python -m http.server 8000` dentro de su carpeta; abrir `http://localhost:8000`. El uso mediante `file://` no es compatible porque la aplicación utiliza módulos de JavaScript.

## Primera carga

1. Pulsar **Nueva máquina**. El número de ficha `M000001`, `M000002`… se genera dentro de este catálogo. No asigna un inventario patrimonial automáticamente: el campo **Identificador de inventario** admite los códigos existentes, por ejemplo `P000019`.
2. Completar las secciones. Los combos permiten escribir valores nuevos; al guardar se incorporan a las listas. El número de serie y los identificadores son textos para conservar ceros y prefijos. Los años admiten `ca. 1916` y otras expresiones de incertidumbre.
3. Agregar imágenes JPG, PNG o WebP. Se crean vistas de hasta 1600 px y miniaturas de 320 px. El original no se modifica ni se conserva dentro del JSON. Cada imagen admite vista, descripción, giro e indicación de principal. El visor permite zoom, arrastre y ampliación.
4. **Guardar ficha** conserva la ficha en este navegador. La marca y el modelo son necesarios solamente para marcarla **Catalogada**. Las fichas incompletas pueden guardarse como **Borrador** o **En revisión**.
5. Al terminar: **Datos y respaldos → Descargar JSON**. El archivo incluye las imágenes optimizadas y permite recuperar la colección en otra computadora. Dentro de la ficha, **Respaldo JSON** también incluye los cambios todavía abiertos.

La copia local se conserva en IndexedDB, ligada al navegador y a la dirección de la aplicación. Borrar los datos del sitio, usar otro perfil o cambiar la dirección no transporta esa copia. El JSON descargado y el guardado en GitHub son respaldos independientes y explícitos.

## Campos de la ficha

- **Identificación:** inventario, número de pieza del coleccionista, marca, modelo, comentario, tipo, funcionamiento mecánico/eléctrico/electrónico, serie y estado de catalogación.
- **Fabricación y teclado:** fabricante, país, año del ejemplar, período de fabricación del modelo, fuente de datación, importador, idioma, distribución, tipografía, muestra de escritura y naipe / muestra de caracteres.
- **Composición:** color, cuerpo, base, teclas, tapa, funda/estuche, pintura, carrete y cinta, manual, partes, gráficas, logo, dimensiones y peso.
- **Conservación y ubicación:** conservación, funcionamiento actual, integridad, limpieza/intervenciones, ubicación, destino y tratamientos.
- **Historia:** procedencia, adquisición y fecha, propietarios, historia y trayectoria.
- **Documentación:** lista repetible de libros, publicidades, efímeras, garantías, facturas, diplomas, fotografías de época, postales, manuales u otros documentos, cada uno con fecha, referencia y notas.
- **Museografía:** objetos asociados, precio histórico, equivalencia con fuente y fecha, propuesta museográfica, arte, notas y fuentes.

Las definiciones y sugerencias están en `assets/schema.js`. Las listas aprendidas se guardan en `vocabularies` dentro del JSON. Las expresiones de la ficha son transcripciones del catalogador; la app no verifica atribuciones ni dataciones históricas.

## Teclado, grilla y pendientes

- **Enter:** siguiente campo; desde el último, pasa a la sección siguiente. En textos largos agrega una línea. **Tab / Shift+Tab:** recorrido habitual.
- **Ctrl+Enter** (Cmd+Enter en Mac): guardar y cerrar. **Ctrl+Shift+Enter:** guardar y siguiente máquina del recorrido. **Esc:** cerrar, con aviso si hay cambios sin guardar.
- Buscar en todos los textos de las fichas y de sus documentos. Filtrar por marca, estado y campo vacío. Ordenar por ficha, marca/modelo, año o última edición.
- Elegir cuatro tamaños de miniaturas y **Solo imágenes**. No se recortan las vistas de las máquinas.
- **Completar un campo:** filtra las fichas vacías y permite recorrer los resultados, empezando en la sección correspondiente.
- Marcar fichas con sus casillas y usar **Editar seleccionadas** para aplicar un valor común. Los identificadores y las series se editan individualmente. La operación se valida completa antes de guardar.

## Guardado en GitHub

El archivo compartido es `data/catalogo.json`, en este mismo repositorio, rama `main`. Se inicia vacío. La app no guarda automáticamente los datos locales en GitHub.

1. En **Datos y respaldos → Conectar GitHub**, usar un token fine-grained limitado a `prodigo-catalogador-maquinas`, con **Contents: Read and write**. El token sólo vive en memoria durante la sesión; no se escribe en archivos ni en almacenamiento del navegador. Se envía exclusivamente a `api.github.com`. Desconectar o recargar lo elimina.
2. **Leer GitHub** recupera la versión online y reemplaza la copia local, previa confirmación. Si tenés trabajo local, descargá primero su JSON.
3. **Guardar GitHub** publica el catálogo completo. Verifica el SHA de partida y rechaza la escritura si otra sesión cambió el archivo. La copia local y la ficha abierta se conservan si falla una operación. Dos pestañas tampoco pueden sobrescribir silenciosamente una copia local que cambió desde su lectura.
4. Para incorporar un respaldo a un catálogo online existente: exportar primero la copia local, leer GitHub y después importar el respaldo. **Agregar fichas** rechaza números o inventarios repetidos; **Reemplazar** permite recuperar intencionalmente la versión del respaldo. Finalmente guardar GitHub.

**Este repositorio es público.** Todo lo publicado allí, incluidas notas de procedencia, imágenes y borradores, es público. La conexión habilita escritura; no constituye una pantalla de privacidad. Eliminar un dato del catálogo actual no lo borra del historial de GitHub.

### Límites de esta primera versión

Las imágenes se incluyen como WebP en el propio JSON para que el respaldo sea autocontenido. El guardado online se limita a **20 MB por JSON**; el uso local depende del espacio del navegador. Para un catálogo grande convendrá separar las imágenes en archivos y mantener sólo sus referencias en el JSON. Los originales deben guardarse por separado. No hay sincronización simultánea automática, importación de TIFF, ni relación automática con el inventario móvil o con el catálogo de fotos.

## Desarrollo y validación

- `npm test`: validación del formato, inventarios duplicados, preservación de datos, búsqueda y conflictos de GitHub con un servicio simulado. No utiliza credenciales.
- `npm start`: servidor local con Python.
- `assets/app.js`: interfaz y recorridos; `core.js`: reglas del catálogo; `storage.js`: copia local; `github.js`: lectura/escritura online; `media.js`: imágenes.

Los datos del catálogo se inician vacíos; no se inventan máquinas ni dataciones de ejemplo como registros de la colección.
