# @dynamic-forms-lib (core)

Librería interna de componentes y servicios para formularios dinámicos y CRUD con ag-grid.

## Contenido
- `components/` - `CrudManagerComponent`, `FormsComponent`, `FieldComponent`, `ConfirmationDialogComponent`, `ActionCellRendererComponent`.
- `services/` - `DynamicOptionsService`, `ThemeService`, `SidebarService`.
- `types/` - Tipos compartidos (`dynamic-form.types.ts`).

## Dependencias (peerDependencies)
La librería declara las siguientes dependencias como `peerDependencies` (deben ser instaladas por el proyecto consumidor):

- `@angular/common`, `@angular/core`, `@angular/forms` (Angular v20+)
- `@angular/material` (Material components usados en los formularios)
- `ag-grid-angular`, `ag-grid-community` (ag-grid para tablas)
- `exceljs` (para exportar XLSX con estilos desde `CrudManagerComponent`)

## Cómo usarla en el proyecto consumidor (monorepo)

1. En este monorepo ya existen las dependencias necesarias en el `package.json` raíz. No es necesario instalar nada adicional para desarrollo local.

2. Si quieres construir la librería como paquete (publicable):

   - Instala `ng-packagr` en el proyecto raíz:

     ```powershell
     npm install --save-dev ng-packagr
     ```

   - Construye la librería:

     ```powershell
     npm run build:lib
     ```

   - Resultado: `dist/dynamic-forms-lib` (lista para publicar o linkear con `npm pack`/`npm install`).

## Scripts (en el `package.json` raíz)

- `build:lib` — Construye la librería con `ng-packagr`.
- `build:all` — Construye la librería y la aplicación.

Ejemplo:

```powershell
npm run build:lib
npm run build
```

## Instalación en otro proyecto Angular (consumidor externo)

1. En el proyecto consumidor instala la librería y las peer deps (ejemplo usando `exceljs` para export):

```powershell
npm install @dynamic-forms-lib/core @angular/material ag-grid-angular ag-grid-community exceljs
```

2. Importa los componentes que necesites en tus componentes `standalone` o módulos:

```ts
import { CrudManagerComponent } from '@dynamic-forms-lib/core';
```

3. Asegúrate de incluir los estilos de Angular Material y ag-grid en `angular.json` del consumidor.

## Notas
Nota sobre exportación a Excel

- En versiones recientes hemos reemplazado `xlsx` / `xlsx-js-style` por `exceljs` en la implementación de exportación (`CrudManagerComponent.onExport()`).
- `exceljs` permite aplicar estilos (font, fill, merges, alignment), fijar anchos de columna y generar `.xlsx` desde el navegador usando `writeBuffer()`.
- Por compatibilidad con Angular se añadió `exceljs` a `allowedCommonJsDependencies` en `angular.json` (si tu proyecto lo requiere, añade la misma entrada).

Si quieres evitar cualquier warning CommonJS en tiempo de build revisa si `exceljs` dispone de una distribución ESM en la versión que uses; de lo contrario mantener la entrada en `allowedCommonJsDependencies` es una solución segura.
