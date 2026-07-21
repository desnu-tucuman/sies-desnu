# Plan de implementación del MVP

Cada etapa termina con pruebas y una aplicación funcional antes de avanzar.

## Etapa 0 — Descubrimiento y contrato de datos

**Resultado:** mapa verificado de hojas, encabezados, tipos, valores y claves de unión.

**Estado:** en curso. Metadatos, encabezados y muestras acotadas ya fueron inspeccionados en modo de solo lectura. Quedan pendientes las validaciones de cardinalidad y cobertura sobre el conjunto completo.

- Configurar acceso de solo lectura.
- Inspeccionar únicamente metadatos, encabezados y muestras necesarias.
- Comparar el resultado con `inventario-datos.md`.
- Definir la clave compuesta de unidad territorial.
- Registrar inconsistencias sin modificar Sheets.

Pruebas: conexión, permisos de lector, existencia de hojas, encabezados requeridos, duplicados y casos de CUE compartido.

## Etapa 1 — Base técnica y acceso a datos

**Resultado:** Next.js ejecutable con configuración validada y servicios capaces de leer Sheets.

**Estado:** completada. Incluye scaffold, cliente de solo lectura, repositorios, validación de encabezados, caché y página de diagnóstico. Lint, tipos, pruebas y build fueron verificados con Node.js 24.18.0 y npm 11.16.0.

- Crear scaffold TypeScript, estilos institucionales y navegación.
- Implementar `sheetsClient`, errores tipados, repositorios, esquemas y caché.
- Añadir pruebas unitarias con filas anonimizadas o fixtures estructurales, nunca datos ficticios servidos por la aplicación.
- Crear estados de carga, vacío y error.

Pruebas: lint, tipos, unitarias, build y lectura controlada de cada hoja.

## Etapa 2 — Inicio y consulta de instituciones

**Resultado:** inicio y tabla usable con filtros, búsqueda, orden y paginación.

- Mostrar año de `CONFIG` y fecha de actualización confirmada.
- Implementar filtros definidos en el requerimiento.
- Mantener filtros en parámetros URL.
- Usar la unidad territorial validada, no solo `cue_anexo`.

Pruebas: filtros combinados, paginación, accesibilidad básica, escritorio y móvil.

## Etapa 3 — Ficha institucional

**Resultado:** selección de institución/sede/anexo/extensión y ficha integrada.

- Identidad desde la maestra.
- Hasta cuatro autoridades.
- Indicadores y año de referencia.
- Carreras separadas por categoría y mostradas una por línea.

Pruebas: unidades con CUE compartido, campos ausentes, cero y vacío, sin autoridades y con distintas ofertas.

## Etapa 4 — Consulta de ofertas

**Resultado:** búsqueda de una carrera y visualización de todos sus lugares reales de dictado.

- Búsqueda normalizada por texto sin perder el valor original.
- Filtros de institución, gestión, territorio, formación, carrera, espacio, año y vigencia.
- Enlaces desde cada resultado hacia la ficha correspondiente.

Pruebas: consultas ejemplo del requerimiento, tildes, coincidencias parciales y extensiones áulicas.

## Etapa 5 — PDF de instituciones y ofertas

**Resultado:** descarga de PDF textual, paginado y agrupado por gestión.

- Reutilizar la misma lógica de filtros del servicio.
- Separar estatal y privada.
- Listar carreras en renglones independientes.
- Añadir título, filtros, fecha, año, fuente, páginas y logo cuando esté disponible.
- Limitar volumen y manejar errores de generación.

Pruebas: contenido, agrupación, caracteres españoles, saltos de página, texto seleccionable y descarga HTTP.

## Etapa 6 — Aceptación y despliegue

**Resultado:** MVP desplegado, documentado y validado contra criterios de aceptación.

- Ejecutar lint, tipos, unitarias, integración y build.
- Validar los escenarios de aceptación con datos reales.
- Revisar seguridad, secretos, caché y mensajes de error.
- Documentar operación, actualización y problemas conocidos.

## Decisiones pendientes antes de programar

- Acceso a la hoja mediante credenciales de lector.
- Encabezados, formatos y claves reales.
- Mecanismo de acceso privado inicial.
- Archivo PNG y reglas visuales oficiales para el PDF.
- Política deseada de frescura de datos (TTL).
