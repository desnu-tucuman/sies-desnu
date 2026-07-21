# Arquitectura propuesta

## Decisiones principales

1. **Next.js App Router y TypeScript:** una sola aplicación para interfaz, consultas del servidor y descargas.
2. **Google Sheets como única fuente de verdad:** acceso de solo lectura mediante cuenta de servicio.
3. **Repositorios por hoja:** `institutionsRepository`, `careersRepository`, `authoritiesRepository` y `configRepository` traducen filas crudas a modelos validados.
4. **Servicios de dominio:** combinan hojas sin acoplar la UI a encabezados o rangos.
5. **Validación en el límite:** los encabezados y cada fila se validan al leerlos. Una fila incompleta produce un diagnóstico controlado; no se completa con datos inventados.
6. **Caché del servidor:** caché con TTL configurable y clave por hoja/rango. Los cambios de la fuente aparecen al vencer la revalidación, sin modificar código.
7. **PDF del servidor:** documento con texto seleccionable, tablas y paginado; no captura de pantalla.

## Capas

### Acceso a datos

`sheetsClient` concentra autenticación, lectura de rangos, timeouts y traducción de errores de la API. Cada repositorio declara la hoja que consume y su esquema de encabezados.

Errores previstos:

- credenciales ausentes o inválidas;
- hoja o rango inexistente;
- encabezados requeridos ausentes o renombrados;
- filas incompletas;
- números vacíos o con formato inesperado;
- indisponibilidad o límite de cuota de Google.

### Dominio y normalización

Los nombres originales de columnas quedan aislados en los repositorios. Los servicios trabajan con modelos TypeScript estables. Las cadenas se recortan y los números vacíos se representan como ausencia, no como cero, salvo que el significado real de la hoja lo confirme.

La identidad territorial necesita una clave compuesta estable. La candidata a validar combina `cue_anexo`, `nombre_sede_oferta`, `tipo_espacio_oferta`, `localidad_oferta` y `departamento_oferta`, normalizados. Debe distinguir una institución madre de cada sede, anexo, extensión y lugar de dictado, incluso cuando compartan CUE.

### Consultas

- `institutionDirectoryService`: listado institucional, filtros, orden y paginación. Lee exclusivamente `MAESTRA_INSTITUCIONES` y conserva una fila por unidad consultable.
- `institutionsService`: composición de la ficha individual después de seleccionar una unidad; integra identidad, autoridades y oferta.
- `careersService`: búsqueda de títulos y lugares de dictado.
- `authoritiesService`: autoridades asociadas a la unidad consultable.
- `reportsService`: aplica los mismos filtros y agrupaciones que la UI.

### Exportaciones

- `reportsService`: coordina datos, filtros y nombres de archivo.
- `csvExportService`: produce CSV UTF-8 con BOM, separador `;` y neutralización de fórmulas.
- `pdfExportService`: genera documentos PDF del lado del servidor con Roboto embebida, logo institucional, texto seleccionable, encabezados repetidos y paginación controlada.
- Los handlers bajo `/api/export` entregan los archivos y nunca exponen credenciales ni escriben en Google Sheets.

### Presentación

Los filtros se reflejan en la URL para que una consulta pueda compartirse y recargarse. Los componentes usarán HTML semántico, foco visible, etiquetas explícitas y tablas adaptables. En teléfonos, las tablas podrán transformarse en tarjetas sin ocultar información esencial.

## Composición de la ficha

La ficha parte de una unidad consultable y combina:

- identidad desde `MAESTRA_INSTITUCIONES`;
- resumen e indicadores desde `CARRERAS_RESUMEN`;
- detalle de oferta desde `CARRERAS_DETALLE`;
- autoridades desde `AUTORIDADES_RESUMEN`;
- año vigente desde `CONFIG`.

La unión entre resumen y detalle partirá de la clave territorial compuesta. La identidad maestra y las autoridades se asociarán por `cue_anexo` con verificación adicional del nombre; las diferencias se reportarán en vez de fusionarse silenciosamente. La regla definitiva no se implementará hasta completar la validación de cardinalidades.

## Separación de fuentes por módulo

- Consulta de instituciones: exclusivamente `MAESTRA_INSTITUCIONES`. `tipo_formacion_base` es una clasificación institucional y no se mezcla con dimensiones académicas.
- Mapa institucional: exclusivamente `MAESTRA_INSTITUCIONES`. El servicio geográfico valida latitud y longitud, separa registros ubicados y no ubicados, y reporta coordenadas anómalas sin intentar corregirlas ni inventarlas.
- Consulta de ofertas: usará `CARRERAS_DETALLE`; el año estadístico se toma exclusivamente de `CONFIG.ANIO_ACTUAL` y filtra `anio_columna`. No se calcula con `MAX`, no se infiere desde los datos y no usa `CICLO_VIGENTE` como sustituto. `CICLO_VIGENTE` y `MOSTRAR_SOLO_VIGENTE` quedan reservados para reglas futuras.
- Ficha institucional: combina `MAESTRA_INSTITUCIONES`, `AUTORIDADES_RESUMEN` y `CARRERAS_RESUMEN` únicamente después de seleccionar una unidad concreta.
- Directorio de autoridades: expande exclusivamente `AUTORIDADES_RESUMEN` a una fila por persona y toma gestión y territorio de `MAESTRA_INSTITUCIONES` mediante unión segura. `AUTORIDADES_ORIGEN` no se expone como fuente pública.
- Generador de listados: `listReportsService` coordina los servicios institucionales, de oferta consolidada y de autoridades. La interfaz sólo solicita vistas previas; CSV y PDF se generan bajo demanda desde rutas de servidor con los mismos filtros.

## Informes

El primer PDF agrupará por gestión (estatal y privada), y dentro de cada grupo mostrará instituto/unidad, localidad, departamento, tipo de sede y carreras en líneas separadas. Incluirá filtros, fecha, año de referencia, numeración, nota de fuente y un espacio de logo configurable. La ausencia temporal del PNG no impedirá generar el documento.

## Seguridad y evolución

- Todas las lecturas ocurren del lado del servidor.
- Ninguna credencial ni clave llega al navegador.
- No habrá endpoints de escritura sobre Sheets.
- Los route handlers validarán parámetros y limitarán el tamaño de exportación.
- La frontera de autorización quedará preparada para incorporar Google Auth y perfiles.
- Las hojas normativas podrán añadirse mediante nuevos repositorios y servicios sin cambiar los existentes.
