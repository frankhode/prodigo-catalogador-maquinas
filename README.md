# Pródigo · Catalogador de máquinas de escribir

Aplicación independiente para catalogar las máquinas de la colección. Funciona en el navegador, sin XAMPP, instalaciones de paquetes ni base de datos. Las fichas, listas y vistas de imágenes se conservan en JSON.

## Abrir la aplicación

En este repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → main → / (root) → Save**.

Dirección, una vez habilitado Pages: **https://frankhode.github.io/prodigo-catalogador-maquinas/**

Para uso local: descargar el repositorio y ejecutar `python -m http.server 8000` dentro de su carpeta; abrir `http://localhost:8000`. El uso mediante `file://` no es compatible porque la aplicación utiliza módulos de JavaScript.

## Arquitectura actual: inventario de lectura → catalogación en JSON

- Origen: las máquinas existentes en Pródigo Inventario, identificadas por su código patrimonial **P**.
- Consulta: exclusivamente solicitudes **GET** a la función pública `museum-catalog` ya existente. No hay cliente Supabase, credenciales, llamadas RPC, modificaciones de tablas ni cargas al bucket desde este catalogador.
- Alcance de esa consulta: objetos con destino **Museo**. Se filtran las categorías Máquina/Máquinas de escribir. Los objetos con destino Tienda/Otros y las fotos de lote sin código no están expuestos por la consulta actual.
- Destino de escritura: **`data/catalogo.json` de este repositorio**, rama `main`. IndexedDB conserva la copia de trabajo antes de publicarla; pulsar **Guardar JSON en GitHub** para guardar los cambios compartidos. El botón pide conectar GitHub si hace falta.
- Futuro: migrar la catalogación ampliada a Supabase cuando esté definida. Esta versión no escribe en Supabase.

Al abrir el catalogador se consulta siempre el inventario actual, aunque ya haya fichas guardadas en este navegador o en GitHub. También se actualiza al volver a la pestaña si pasó más de un minuto, siempre que no haya una ficha abierta. **Actualizar inventario** vuelve a consultar el origen: incorpora nuevas máquinas, completa campos vacíos de fichas existentes y actualiza valores que siguen iguales a su última lectura. Si modificaste un valor en el catalogador, se conserva tu edición. Nunca se borran fichas por haber dejado de aparecer en el origen. La operación completa se valida antes de guardar la copia de trabajo. Se muestra la fecha/hora de consulta y la cantidad de máquinas presentes en el origen. Las fichas que ya no aparecen allí se conservan y se cuentan aparte; no se eliminan ediciones del catalogador. Si la lectura falla, se informa el error y se conserva la copia anterior.

El código P vinculado queda fijo. El número M identifica únicamente la ficha dentro del JSON. Los datos comunes (marca, modelo, fecha, tipo, serie, etc.) se leen del inventario; desde 1.5.8 se guardan también en él. Los campos ampliados y las relaciones documentales pertenecen al catalogador. `inventorySource` conserva una instantánea local de la última lectura para detectar cambios y conflictos.

Las fotos del inventario se guardan como enlaces a la consulta pública, con su principal y adicionales. Requieren conexión y disponibilidad del origen. Los archivos agregados desde el catalogador sí quedan incrustados y optimizados en el JSON. Quitar una foto del catalogador no la quita del inventario ni vuelve a agregarla en la siguiente lectura. El respaldo JSON conserva los enlaces; no contiene una copia de esas fotos remotas.

## Primera carga

1. Partir de **Actualizar inventario** para las máquinas ya inventariadas. Para una ficha adicional independiente, pulsar **Nueva máquina**. El número de ficha `M000001`, `M000002`… se genera dentro de este catálogo. No asigna un inventario patrimonial automáticamente: el campo **Número de inventario** admite los códigos existentes, por ejemplo `P000019`.
2. Completar la identificación central del objeto. Todos los campos editables tienen una lista con buscador: el botón junto al campo abre las opciones cargadas. Escribí en el buscador para filtrar o elegí **Agregar** si el valor es nuevo; al guardar la ficha queda disponible en la lista de ese campo. El número de serie y los identificadores son textos para conservar ceros y prefijos. Los años admiten `ca. 1916` y otras expresiones de incertidumbre.
3. Agregar imágenes JPG, PNG o WebP. Se crean vistas de hasta 1600 px y miniaturas de 320 px. El original no se modifica ni se conserva dentro del JSON. Cada imagen admite vista, descripción, giro e indicación de principal. El visor permite zoom, arrastre y ampliación.
4. **Guardar ficha** conserva la ficha en este navegador. Las fichas incompletas se pueden guardar. Se conserva el estado de catalogación que ya tuviera cada ficha.
5. Al terminar: **Datos y respaldos → Descargar JSON**. El archivo incluye las imágenes agregadas optimizadas y los enlaces a las del inventario y permite recuperar la colección en otra computadora. Dentro de la ficha, **Respaldo JSON** también incluye los cambios todavía abiertos.

La copia local se conserva en IndexedDB, ligada al navegador y a la dirección de la aplicación. Borrar los datos del sitio, usar otro perfil o cambiar la dirección no transporta esa copia. El JSON descargado y el guardado en GitHub son respaldos independientes y explícitos.

## Identificación central del objeto

La ficha abre directamente en una única pantalla, sin las siete pestañas anteriores. Incluye:

- Número de inventario (conserva el código P del inventario).
- Denominación del objeto.
- Marca, modelo y versión.
- Número de serie y año de fabricación.
- Color, idioma del teclado y país de fabricación.
- Fotografía principal, seleccionable entre las imágenes de la pieza.
- Colección.

Las fichas de máquinas parten de la denominación «Máquina de escribir». Versión y colección se completan al catalogar: las sugerencias no se asignan automáticamente. Los ejemplos de la referencia no reemplazan los códigos ni los datos de los ejemplares.

Los valores de las antiguas secciones, incluidos documentos, notas y procedencias, siguen conservados en el JSON, las exportaciones y los guardados, aunque ya no se muestran en esta pantalla. A partir de 1.5.8, para las máquinas el número cargado en el inventario se muestra como número de serie; se conserva la numeración histórica distinta consignada por separado.

Las definiciones y sugerencias están en `assets/schema.js`. Las listas aprendidas se guardan en `vocabularies` dentro del JSON. Incluyen los campos de identificación y la vista/descripción de imágenes. Se conservan además las listas anteriores. Las opciones se recuperan también de las fichas ya cargadas, sin tener que migrarlas. Cada campo conserva su lista independiente; se evitan opciones duplicadas que sólo cambian mayúsculas, tildes o espacios. La selección reutiliza el texto guardado sin reescribir los registros anteriores.

El botón junto al campo abre el buscador; **Alt+Flecha abajo** también lo abre (en campos cortos basta Flecha abajo). **Flechas arriba/abajo y Enter** eligen una opción; **Esc** cierra solamente la lista. Clic afuera también la cierra. El desplazamiento del formulario y la apertura del teclado móvil reubican la lista sin cerrarla. Los textos largos conservan sus saltos de línea. Se pueden agregar nuevas opciones; los filtros de estado conservan los valores cargados anteriormente. El código P vinculado al inventario conserva su protección y no se reasigna desde una lista. Las expresiones de la ficha son transcripciones del catalogador; la app no verifica atribuciones ni dataciones históricas.

## Teclado, grilla y pendientes

- **Enter:** siguiente campo; desde el último, enfoca Guardar ficha. En textos largos agrega una línea. **Tab / Shift+Tab:** recorrido habitual.
- **Ctrl+Enter** (Cmd+Enter en Mac): guardar y cerrar. **Ctrl+Shift+Enter:** guardar y siguiente máquina del recorrido. **Esc:** cerrar, con aviso si hay cambios sin guardar.
- Buscar en todos los textos de las fichas y de sus documentos. Filtrar por marca, estado y campo vacío. Ordenar por ficha, marca/modelo, año o última edición.
- Elegir cuatro tamaños de miniaturas y **Solo imágenes**. No se recortan las vistas de las máquinas.
- **Completar un campo:** filtra las fichas vacías y permite recorrer los resultados, en la pantalla de identificación.
- Marcar fichas con sus casillas y usar **Editar seleccionadas** para aplicar un valor común. Los identificadores y las series se editan individualmente. La operación se valida completa antes de guardar.

## Guardado en GitHub

El archivo compartido es `data/catalogo.json`, en este mismo repositorio, rama `main`. Incluye una base inicial leída del inventario (352 máquinas con destino Museo). La app no guarda automáticamente los datos locales en GitHub.

1. En **Datos y respaldos → Conectar GitHub**, usar un token fine-grained limitado a `prodigo-catalogador-maquinas`, con **Contents: Read and write**. El token sólo vive en memoria durante la sesión; no se escribe en archivos ni en almacenamiento del navegador. Se envía exclusivamente a `api.github.com`. Desconectar o recargar lo elimina.
2. **Leer GitHub** recupera la versión online y reemplaza la copia local, previa confirmación. Si tenés trabajo local, descargá primero su JSON.
3. **Guardar GitHub** publica el catálogo completo. Verifica el SHA de partida y rechaza la escritura si otra sesión cambió el archivo. La copia local y la ficha abierta se conservan si falla una operación. Dos pestañas tampoco pueden sobrescribir silenciosamente una copia local que cambió desde su lectura.
4. Para incorporar un respaldo a un catálogo online existente: exportar primero la copia local, leer GitHub y después importar el respaldo. **Agregar fichas** rechaza números o inventarios repetidos; **Reemplazar** permite recuperar intencionalmente la versión del respaldo. Finalmente guardar GitHub.

**Este repositorio es público.** Todo lo publicado allí, incluidas notas de procedencia, imágenes y borradores, es público. La conexión habilita escritura; no constituye una pantalla de privacidad. Eliminar un dato del catálogo actual no lo borra del historial de GitHub.

### Límites de esta primera versión

Las imágenes agregadas se incluyen como WebP en el propio JSON para que el respaldo sea autocontenido. El guardado online se limita a **20 MB por JSON**; el uso local depende del espacio del navegador. Para un catálogo grande convendrá separar las imágenes en archivos y mantener sólo sus referencias en el JSON. Los originales deben guardarse por separado. No hay sincronización simultánea automática, importación de TIFF, ni escritura hacia el inventario móvil ni relación automática con el catálogo de fotos.

## Desarrollo y validación

- `npm test`: validación del formato, inventarios duplicados, preservación de datos, búsqueda y conflictos de GitHub con un servicio simulado. No utiliza credenciales.
- `npm start`: servidor local con Python.
- `assets/app.js`: interfaz y recorridos; `core.js`: reglas del catálogo; `storage.js`: copia local; `github.js`: lectura/escritura online; `media.js`: imágenes.

El JSON compartido contiene la base inicial del inventario y se actualiza leyendo el origen y guardando en GitHub. No se inventan máquinas ni dataciones de ejemplo.


## Identificación compartida con Inventario (1.5.8)

**Activación en Supabase:** ejecutar una vez [`supabase/202611260002_shared_machine_fields.sql`](supabase/202611260002_shared_machine_fields.sql) en el mismo proyecto, después de las migraciones de catálogo y carga asistida. No modifica registros existentes: agrega el RPC autenticado de guardado conjunto y retira el permiso de la versión anterior. Recargar ambas aplicaciones. Hasta activarlo el catalogador queda en modo consulta.

- `inventory_items` es la fuente única de marca, modelo, año, número de serie, notas del inventario, color, versión (columna existente `type`), país de fabricación, idioma y distribución del teclado. Al guardar desde la ficha M se actualizan solamente los campos comunes modificados en el objeto P, con control de la revisión de inventario y de catálogo en una única transacción. Los campos comunes ya no se guardan en el payload de las fichas nuevas.
- Para máquinas, `original_number` se presenta como número de serie. «Numeración original del inventario» queda separado para una numeración histórica diferente, aportada explícitamente en catalogación. No se renumeran los objetos P. Si el número legado de una máquina no era realmente una serie, revisarlo manualmente.
- Versión/país y teclado legados se leen sin modificar la base. Al editar un par en cualquiera de las interfaces, se graban sus campos independientes (`type` para versión y `País` para país). Los nombres de países e idiomas reconocidos se ubican en el campo correspondiente; lo demás se conserva como versión o distribución.
- Los datos exclusivos de catalogación (estado, colección, documentación, observaciones, etc.) permanecen en `machine_catalog_records`. Una ficha anterior que tuviera correcciones divergentes ofrece revisar los valores antiguos sin pisar silenciosamente el inventario; se puede elegir el valor anterior o mantener el actual.
- Si otra persona editó el objeto o la ficha después de abrirla, se rechaza el guardado entero. Refrescar para leer la última versión y aplicar la corrección. No se crean números P desde el catalogador ni se cambian fotos, destino o estado de etiquetado mediante este flujo.
