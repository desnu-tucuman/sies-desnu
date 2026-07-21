# SIES

Sistema interno de Información de Educación Superior No Universitaria de la Dirección de Educación Superior No Universitaria del Ministerio de Educación de Tucumán.

## Objetivo

El sistema permitirá consultar información institucional, autoridades y oferta académica desde el archivo de Google Sheets `BASE_LOOKER_FICHA_INSTITUCIONAL`, generar listados y descargar un informe PDF. Google Sheets seguirá siendo la única fuente de verdad: el MVP no crea una base paralela ni permite editar las hojas.

## Alcance del MVP

- Inicio con accesos rápidos, fecha de actualización y año de referencia.
- Consulta paginada de instituciones, sedes, anexos y extensiones áulicas.
- Ficha institucional con identidad, autoridades, carreras e indicadores.
- Consulta de ofertas y lugares reales de dictado.
- Filtros por gestión y departamento, además de los filtros definidos para cada consulta.
- PDF de instituciones y ofertas, separado por gestión estatal y privada.

El directorio completo de autoridades, Excel/CSV, autenticación y el módulo normativo quedan preparados en la arquitectura, pero fuera de este primer incremento salvo que se acuerde ampliar el alcance.

## Mapa institucional

La ruta `/mapa` visualiza las unidades de `MAESTRA_INSTITUCIONES` con Leaflet y OpenStreetMap. Permite filtrar el directorio institucional, agrupa puntos cercanos y enlaza cada marcador con la ficha existente. No utiliza Google Maps ni fuentes de carreras.

Las coordenadas se validan antes de llegar al componente visual. Los registros sin coordenadas válidas no se ubican de forma aproximada: se contabilizan y se muestran en una tabla aparte. Las coordenadas no numéricas o fuera del rango razonable para Tucumán se registran en el servidor para su revisión, sin modificar Google Sheets.

## Arquitectura propuesta

Se propone Next.js con App Router, React y TypeScript. Las páginas consumen casos de uso del servidor; nunca acceden directamente a Google Sheets.

```text
src/
  app/                    rutas, páginas y route handlers
  components/             componentes accesibles y reutilizables
  features/               UI y casos de uso por dominio
    institutions/
    careers/
    authorities/
    reports/
  server/
    sheets/                cliente Google Sheets de solo lectura
    repositories/          adaptadores de cada hoja
    services/              consultas y composición entre hojas
    reports/               generación de PDF
    cache/                 caché y revalidación
  domain/                  tipos, esquemas y reglas del negocio
  config/                  lectura y validación de configuración
```

Flujo: `Google Sheets API -> repositorios -> validación/normalización -> servicios -> páginas o exportadores`.

Las claves internas de una unidad consultable se construirán con los campos reales disponibles y validados. No se usará `cue_anexo` como identificador territorial único. La etiqueta visible priorizará `nombre_sede_oferta` y, cuando no corresponda, el nombre institucional normalizado.

La descripción detallada está en [docs/arquitectura.md](docs/arquitectura.md).

## Requisitos

- Node.js 22 LTS o superior. El proyecto fue verificado también con Node.js 24.18.0 y npm 11.16.0.
- npm 10 o superior.
- Proyecto de Google Cloud con Google Sheets API habilitada.
- Cuenta de servicio con acceso de lector al archivo fuente.
- Acceso al Google Sheets con ID `1cNl1x2ijvshZsF1tiOZOlptLDHqvoCGMfp7B42MdGMQ`.

## Variables de entorno

Crear `.env.local` (no versionarlo):

```dotenv
GOOGLE_SHEETS_SPREADSHEET_ID=1cNl1x2ijvshZsF1tiOZOlptLDHqvoCGMfp7B42MdGMQ
GOOGLE_SERVICE_ACCOUNT_EMAIL=cuenta-servicio@proyecto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SIES_CACHE_TTL_SECONDS=300
```

La clave privada debe conservar los saltos como `\n`. En producción se carga en el administrador de secretos del proveedor. Nunca se guarda el JSON de credenciales en el repositorio.

Puede copiarse la plantilla incluida:

```bash
cp .env.example .env.local
```

En PowerShell:

```powershell
Copy-Item .env.example .env.local
```

`.env.local` está excluido del control de versiones. Las variables no usan el prefijo `NEXT_PUBLIC_`, por lo que solo están disponibles en el servidor.

## Crear la cuenta de servicio y habilitar la API

1. Crear o seleccionar un proyecto en Google Cloud.
2. Abrir **APIs y servicios > Biblioteca**, buscar **Google Sheets API** y pulsar **Habilitar**.
3. Abrir **IAM y administración > Cuentas de servicio** y crear una cuenta para SIES. No necesita roles de edición sobre el proyecto ni sobre Drive.
4. Entrar en la cuenta creada, abrir **Claves**, elegir **Agregar clave > Crear clave nueva > JSON** y descargarla una sola vez.
5. Del JSON, copiar `client_email` a `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6. Copiar `private_key` a `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, conservando los saltos escapados como `\n`.
7. No copiar el archivo JSON al proyecto y guardarlo en un lugar seguro o eliminarlo después de cargar el secreto en el proveedor.

## Compartir Google Sheets en modo lectura

1. Copiar el correo de la cuenta de servicio (`client_email`).
2. Abrir `BASE_LOOKER_FICHA_INSTITUCIONAL` en Google Sheets.
3. Pulsar **Compartir**, agregar ese correo y asignar únicamente el rol **Lector**.
4. Mantener el ID del archivo en `GOOGLE_SHEETS_SPREADSHEET_ID`.

No es necesario dar permisos de edición ni publicar la hoja en la web.

## Instalación local

1. Instalar Node.js 22 LTS.
2. Crear `.env.local` a partir de `.env.example` y completar las credenciales.
3. Instalar y verificar:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Con `npm run dev`, abrir `http://localhost:3000/diagnostico`. La página informa conexión, año vigente y cantidades de registros de las hojas del MVP. Si falta un encabezado, muestra la hoja, las columnas faltantes y las columnas encontradas.

La aplicación solicita únicamente el alcance OAuth `spreadsheets.readonly`. El cliente está centralizado en `src/server/sheets/sheets-client.ts`; los componentes visuales consumen servicios del servidor y no consultan la API directamente.

## Diagnóstico y caché

`/diagnostico` comprueba `CONFIG`, `MAESTRA_INSTITUCIONES`, `CARRERAS_RESUMEN` y `AUTORIDADES_RESUMEN`. Las filas totalmente vacías no cuentan como registros. Las lecturas se almacenan en caché durante `SIES_CACHE_TTL_SECONDS` (300 segundos por defecto).

Los errores de autenticación o permisos no exponen tokens ni respuestas sensibles de Google al navegador. Los errores de esquema sí enumeran encabezados para facilitar el mantenimiento.

## Exportaciones disponibles

- `/api/export/instituciones/csv`: listado institucional CSV; acepta los mismos filtros que `/instituciones`.
- `/api/export/instituciones/pdf`: listado institucional PDF filtrado.
- `/api/export/instituciones/[identificador]/csv`: ficha individual CSV.
- `/api/export/instituciones/[identificador]/pdf`: ficha institucional PDF.

Los CSV usan UTF-8 con BOM y separador `;`. Los PDF se generan en el servidor con Roboto y el logo ubicado en `public/brand/logo-desnu.png`.

## Despliegue

La opción recomendada para el MVP es Vercel por su integración directa con Next.js:

1. Importar el repositorio.
2. configurar las cuatro variables de entorno;
3. seleccionar Node.js 22;
4. desplegar y restringir la URL mediante la protección disponible o una autenticación simple acordada;
5. verificar conectividad, caché, PDF y ausencia de secretos en logs.

También puede desplegarse como contenedor en Cloud Run. Para producción conviene usar un gestor de secretos y una identidad de servicio en lugar de distribuir claves cuando el proveedor lo permita.

## Documentación

- [Arquitectura y decisiones](docs/arquitectura.md)
- [Inventario de hojas y campos](docs/inventario-datos.md)
- [Plan de implementación del MVP](docs/plan-mvp.md)
