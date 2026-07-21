# Inventario de datos verificado

## Inspección

Fuente inspeccionada en modo de solo lectura: `BASE_LOOKER_FICHA_INSTITUCIONAL` (`1cNl1x2ijvshZsF1tiOZOlptLDHqvoCGMfp7B42MdGMQ`).

La inspección se realizó sobre metadatos, encabezados y muestras acotadas. El archivo usa zona horaria `America/Argentina/Tucuman`, configuración regional `en_US` y contiene 19 pestañas.

## Hojas del MVP

### `MAESTRA_INSTITUCIONES`

Dimensión declarada: 945 filas × 26 columnas. Fila 1 congelada y usada como encabezado.

```text
cue_anexo
cui
nombre_establecimiento
gestion
tipo_formacion_base
tipo_sede
ambito
direccion
localidad
departamento
telefono
email_institucional
sitio_web
internet
turno
horario
estado_edificio
comparte_edificio_con
radio_socioeducativa
consejo_consultivo
fecha_creacion
instrumento_creacion
ubicacion_google_maps
latitud_sede
longitud_sede
observaciones
```

Observaciones de contrato:

- `tipo_formacion_base` corresponde a la clasificación institucional docente, técnica o mixta.
- `tipo_sede` identifica sede, anexo o extensión áulica.
- El concepto solicitado “edificio compartido” debe derivarse de `estado_edificio` y/o `comparte_edificio_con`; no existe un encabezado literal `edificio_compartido`.
- No existe una columna `dependencia` en esta hoja.
- Teléfonos, correos, fechas y marcadores como `S/D` deben tratarse como texto.

### `CARRERAS_DETALLE`

Dimensión declarada: 2594 filas × 24 columnas. La fila de encabezados contiene 20 campos; las cuatro columnas restantes de la cuadrícula no forman parte del contrato observado.

```text
cue_anexo
cui
nombre_establecimiento
titulo
tipo_carrera
tipo_formacion
estado_carrera
anio_columna
matricula_total
ingresantes
egresados
nombre_sede_oferta
tipo_espacio_oferta
localidad_oferta
departamento_oferta
latitud_oferta
longitud_oferta
observaciones
oferta_vigente
gestion
```

Observaciones de contrato:

- Es la fuente canónica para listar carreras una por línea y para búsquedas por título.
- `anio_columna` es el año estadístico y debe filtrarse exclusivamente con `CONFIG.ANIO_ACTUAL`; no debe confundirse con `anio_referencia`, inferirse con `MAX` ni sustituirse por `CICLO_VIGENTE`.
- `estado_carrera` y `oferta_vigente` son campos distintos.
- Se observaron valores numéricos vacíos; vacío no equivale automáticamente a cero.
- `cui` puede estar vacío.
- Existen variantes tipográficas dentro de títulos, por ejemplo espacios dobles; la búsqueda debe normalizar sin alterar el valor mostrado.

### `CARRERAS_RESUMEN`

Dimensión declarada: 1000 filas × 26 columnas. Fila 1 congelada.

```text
cue_anexo
cui
nombre_establecimiento
nombre_sede_oferta
tipo_espacio_oferta
gestion
localidad_oferta
departamento_oferta
latitud_oferta
longitud_oferta
cantidad_carreras
cantidad_profesorados
cantidad_tecnicaturas
cantidad_otras_formaciones
carreras
profesorados
tecnicaturas
otras_formaciones
tiene_profesorados
tiene_tecnicaturas
tiene_otras_formaciones
tipo_oferta_resumen
matricula_total
ingresantes
egresados
anio_referencia
```

Observaciones de contrato:

- Los listados de `carreras`, `profesorados`, `tecnicaturas` y `otras_formaciones` están concatenados con ` | `. La aplicación no dependerá de ese separador para construir la ficha; consultará el detalle.
- Los indicadores `tiene_*` usan valores observados `SI`/`NO`.
- `tipo_oferta_resumen` usa etiquetas de presentación como `Técnica`.
- `anio_referencia` se observó como 2025 y debe contrastarse con `CONFIG` en cada lectura.

### `AUTORIDADES_RESUMEN`

Dimensión declarada: 1001 filas × 22 columnas. Fila 1 congelada.

```text
cue_anexo
nombre_establecimiento
cargo_1
autoridad_1_nombre
autoridad_1_telefono
autoridad_1_mail
cargo_2
autoridad_2_nombre
autoridad_2_telefono
autoridad_2_mail
cargo_3
autoridad_3_nombre
autoridad_3_telefono
autoridad_3_mail
cargo_4
autoridad_4_nombre
autoridad_4_telefono
autoridad_4_mail
cantidad_autoridades
autoridades_texto
estado_autoridad
ultima_actualizacion
```

Para el MVP, esta vista permite mostrar hasta cuatro autoridades. La unión candidata es `cue_anexo` más verificación de `nombre_establecimiento`; no debe realizarse únicamente por nombre.

### `AUTORIDADES_ORIGEN`

Dimensión declarada: 1024 filas × 20 columnas. La región usada actualmente ocupa siete columnas.

Encabezados verificados después de la corrección de la columna A:

```text
cue_anexo
cargo_funcion
apellido_y_nombre
dni
telefono
mail
nombre_establecimiento
```

`AUTORIDADES_ORIGEN!A1` fue corregida por el responsable de la hoja y se verificó nuevamente en modo de solo lectura. La tabla ya puede validarse por encabezados. Para la ficha del MVP se seguirá priorizando `AUTORIDADES_RESUMEN`; el origen se reservará para el futuro directorio detallado y controles de consistencia.

### `CONFIG`

Estructura confirmada de pares `parametro`/`valor`:

| parametro | valor observado |
| --- | ---: |
| `ANIO_ACTUAL` | 2025 |
| `CICLO_VIGENTE` | 2025 |
| `MOSTRAR_SOLO_VIGENTE` | `TRUE` |

La aplicación leerá estos parámetros por nombre; no dependerá del número de fila.

## Hojas auxiliares observadas

- `CONSULTA_RAPIDA_OFERTAS`
- `Copy of AUTORIDADES_RESUMEN`
- `Copy of CARRERAS_RESUMEN`
- `CURADURIA_SIES`
- `DICCIONARIO_DATOS`
- `ROADMAP_SIES`
- `MODELO_NORMATIVO_SIES`

Las hojas con prefijo `Copy of` no se usarán como fuente. `DICCIONARIO_DATOS` confirma, entre otros, el rol de `nombre_establecimiento` como clave visual y el carácter calculado de `CARRERAS_RESUMEN`.

## Hojas normativas observadas

- `RESOLUCIONES`
- `VALIDEZ_NACIONAL`
- `DISENOS_CURRICULARES`
- `ADHESIONES_CARRERA`
- `CAT_NORMATIVA_SIES`
- `REQUISITOS_REFFOD_VN`

Permanecen fuera del MVP funcional.

## Reglas de normalización y unión

1. Leer identificadores (`cue_anexo`, `cui`) como texto, aunque la API entregue algunas celdas como números.
2. No usar `cue_anexo` solo como identidad del lugar real de dictado.
3. Identificar provisionalmente una unidad de oferta con una clave compuesta de `cue_anexo`, `nombre_sede_oferta`, `tipo_espacio_oferta`, `localidad_oferta` y `departamento_oferta`, normalizados. La cardinalidad de esta clave debe validarse sobre todas las filas antes de fijarla.
4. Usar `nombre_sede_oferta` como etiqueta de la unidad territorial y `nombre_establecimiento` como identidad institucional cuando corresponda.
5. Unir la identidad maestra por `cue_anexo` y verificar nombre/tipo territorial. Las diferencias se reportarán, no se fusionarán silenciosamente.
6. Construir carreras e indicadores de detalle desde `CARRERAS_DETALLE` filtrando el año y vigencia definidos por `CONFIG`.
7. Usar `CARRERAS_RESUMEN` como vista de consulta rápida y control cruzado.
8. Conservar vacío como ausencia. Convertir a cero solo campos agregados cuyo contrato lo justifique.
9. Normalizar mayúsculas, tildes y espacios solo para búsqueda/comparación; preservar el texto original para mostrarlo.

## Problemas confirmados

1. `cui` aparece vacío en muestras de carreras y no puede ser obligatorio para unir.
2. La cuadrícula de `CARRERAS_DETALLE` tiene 24 columnas, pero solo 20 encabezados activos.
3. Hay títulos con variantes de espaciado.
4. Hay métricas vacías en el histórico.
5. `dependencia`, solicitada conceptualmente para la ficha, no existe en los encabezados de `MAESTRA_INSTITUCIONES`.
6. La fuente de una “fecha de actualización” global no aparece en `CONFIG`; puede usarse una fecha de actualización del archivo solo si se acuerda su significado.

## Incidencias resueltas

- `AUTORIDADES_ORIGEN!A1` contenía un dato en lugar del encabezado. Fue corregida a `cue_anexo` y verificada mediante lectura posterior.

## Validaciones aún pendientes

- Cardinalidad completa de la clave compuesta de unidad de oferta.
- Valores distintos de gestión, tipos de sede, formación, carrera y vigencia.
- Cobertura de cada unidad entre maestra, carreras y autoridades.
- Filas efectivamente ocupadas frente al tamaño declarado de cada cuadrícula.
- Coherencia de agregados entre detalle y resumen para el año configurado.
