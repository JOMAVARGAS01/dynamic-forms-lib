# @dynamic-forms-lib/core

**Build complete enterprise CRUD screens with JSON config — AG Grid table, dynamic Angular Material forms, Excel export, and theming in a single component.**

> ⚡ **Zero boilerplate.** Define a JSON config → get a fully working CRUD page with grid, search, pagination, modal form, validation, and export.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Angular](https://img.shields.io/badge/Angular-20%2B-red)](https://angular.dev)
[![Material](https://img.shields.io/badge/Material-20%2B-blue)](https://material.angular.io)
[![AG Grid](https://img.shields.io/badge/AG%20Grid-34%2B-orange)](https://www.ag-grid.com)
[![GitHub](https://img.shields.io/badge/GitHub-JOMAVARGAS01-blue)](https://github.com/JOMAVARGAS01/dynamic-forms-lib)

---

## ✨ Features

### 🏆 The Unique Value: `CrudManagerComponent`

The only component in the Angular ecosystem that combines **AG Grid data table** + **dynamic Material form** + **Excel export** + **CRUD operations** in a single, configurable unit.

```html
<app-crud-manager
  [formConfig]="config"
  [columnDefs]="columns"
  [apiUrl]="'/api/entities'"
  [title]="'Entity Maintenance'">
</app-crud-manager>
```

That's it. One tag, full CRUD screen.

### 📋 Form Features

| Feature | Details |
|---------|---------|
| **19 field types** | text, number, email, password, tel, url, color, time, week, month, textarea, date, select, autocomplete, checkbox, checkbox-multiple, radio, switch, file, form-array |
| **4 layouts** | tabs, accordion, simple (cards), steps (stepper) |
| **Conditional visibility** | `visibleIf` — show/hide fields based on other field values |
| **Read-only mode** | `readonly` property per field |
| **Prefix/suffix** | Icons and text before/after input fields |
| **Validation** | required, minLength, maxLength, pattern, min, max, email |
| **Dynamic options** | Load select/autocomplete options from API with cascading dependencies |
| **Dependent options** | Local cascading select via `dependentOptions.map` |
| **File upload** | Native file input with FormData submission |
| **Repeating groups** | `form-array` — collapsible items, per-item validation, per-item `visibleIf` / `dependentOptions` / `api.dependsOn`, JSON-string serialization |
| **Appearance token** | Global `fill`/`outline` injection via `FORM_FIELD_APPEARANCE_TOKEN` |

### 📊 Grid Features (AG Grid)

- Pagination, sorting, filtering, quick search
- Editable, sortable, resizable columns
- Action column (edit/delete) auto-injected
- Real-time grid theme switching (material, alpine, balham, quartz)
- Dark mode support
- Excel export with styled headers, titles, and dates

### 🎨 Theming (`ThemeService`)

- **12 color palettes**: Red, Green, Blue, Yellow, Cyan, Magenta, Orange, Chartreuse, Spring Green, Azure, Violet, Rose
- **Light / Dark / System** mode
- **4 AG Grid themes**: Alpine, Material, Balham, Quartz
- Persisted to localStorage automatically

### 🌍 Internationalization (i18n)

The library is **language-agnostic by design** — it ships no hardcoded text. Your app provides translations via Angular's `InjectionToken`:

```typescript
import { provideDynamicFormsTranslations, DynamicFormsTranslations } from '@dynamic-forms-lib/core';

const SPANISH: DynamicFormsTranslations = {
  crud:    { add: 'Nuevo', export: 'Exportar', search: 'Buscar...', /* ... */ },
  form:    { save: 'Guardar Cambios', cancel: 'Cancelar', /* ... */ },
  dialog:  { confirmation: 'Confirmación', /* ... */ },
  field:   { required: 'Este campo es requerido.', /* ... */ },
  actionCell: { edit: 'Editar Registro', delete: 'Eliminar Registro' },
  snackbar: { close: 'Cerrar' },
};

bootstrapApplication(AppComponent, {
  providers: [
    provideDynamicFormsTranslations(SPANISH)
  ]
});
```

Switch languages at runtime by updating the same `Signal` you bound to the token. The grid headers, button labels, validation messages, dialog text, and snackbar action all react automatically.

Default behavior: if no provider is registered, the token resolves to Spanish defaults — zero-config backward compatibility for existing consumers.

---

## 🚀 Quick Start

### 1. Install

```bash
npm install @dynamic-forms-lib/core @angular/material ag-grid-angular ag-grid-community exceljs
```

### 2. Add styles to `angular.json`

```json
"styles": [
  "@angular/material/prebuilt-themes/azure-blue.css",
  "ag-grid-community/styles/ag-theme-material.css"
]
```

### 3. Use it

```typescript
import { Component } from '@angular/core';
import { CrudManagerComponent } from '@dynamic-forms-lib/core';
import type { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-my-entity',
  standalone: true,
  imports: [CrudManagerComponent],
  template: `
    <app-crud-manager
      [formConfig]="formConfig"
      [columnDefs]="columnDefs"
      [apiUrl]="apiUrl"
      title="My Entity" />
  `
})
export class MyEntityComponent {
  apiUrl = '/api/myentity';

  formConfig = {
    layout: 'tabs',
    groups: [{
      label: 'Details',
      type: 'tabs',
      fields: [
        {
          type: 'text',
          label: 'Name',
          name: 'name',
          gridCols: 6,
          validations: { required: true }
        },
        {
          type: 'select',
          label: 'Status',
          name: 'status',
          gridCols: 4,
          api: {
            endpoint: '/api/statuses',
            valueKey: 'id',
            labelKey: 'name'
          },
          validations: { required: true }
        }
      ]
    }]
  };

  columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Name', sortable: true, filter: true },
    { field: 'status', headerName: 'Status', sortable: true, filter: true }
  ];
}
```

---

## 📚 Component API

### `CrudManagerComponent`

The main component — complete CRUD screen with AG Grid + dynamic form modal.

| Input | Type | Required | Description |
|-------|------|:--------:|-------------|
| `formConfig` | `FormConfig` | ✅ | JSON form definition |
| `columnDefs` | `ColDef[]` | ✅ | AG Grid column definitions |
| `apiUrl` | `string` | ✅ | Base API endpoint |
| `title` | `string` | ❌ | Page title (default: 'Mantenimiento') |
| `createUrl` | `string` | ❌ | Custom create endpoint |
| `updateUrl` | `string \| function` | ❌ | Custom update endpoint or URL builder |
| `deleteUrl` | `function` | ❌ | Custom delete URL builder |
| `responseMapper` | `function` | ❌ | Transform API response (default: identity) |
| `showActions` | `boolean` | ❌ | Show edit/delete actions column (default: true) |

### `FormsComponent`

Standalone dynamic form renderer.

| Input | Type | Required | Description |
|-------|------|:--------:|-------------|
| `config` | `FormConfig` | ✅ | JSON form definition |
| `mode` | `'add' \| 'edit'` | ❌ | Form mode |
| `initialData` | `object` | ❌ | Data for edit mode |
| `appearance` | `'fill' \| 'outline'` | ❌ | Material appearance |

| Output | Payload | Description |
|--------|---------|-------------|
| `formSubmit` | `FormData` | Emitted on valid submit |
| `cancel` | `void` | Emitted on cancel |

### `FieldComponent`

Individual field renderer with 18 type support. Used internally by `FormsComponent`.

---

## 📐 Configuration Reference

### `FormConfig`

```typescript
interface FormConfig {
  layout?: 'tabs' | 'accordion' | 'simple' | 'steps';  // default: 'simple'
  groups: GroupConfig[];
  stepper?: {                          // only when layout: 'steps'
    linear?: boolean;
    orientation?: 'horizontal' | 'vertical';
  };
}
```

### `GroupConfig`

```typescript
interface GroupConfig {
  label: string;
  type: 'tabs' | 'accordion' | 'simple';
  fields: FieldConfig[];
}
```

### `FieldConfig` (per field type)

| Property | Type | Description |
|----------|------|-------------|
| `type` | `ControlType` | Field type (see below) |
| `name` | `string` | Field key (maps to API payload) |
| `label` | `string` | Display label |
| `gridCols` | `number` | Grid columns 1-12 (default: 12) |
| `value` | `any` | Default value |
| `readonly` | `boolean` | Disable editing |
| `visibleIf` | `{ field: string, value: any }` | Conditional visibility |
| `validations` | `ValidationRules` | Validation constraints |
| `prefix` | `{ icon: string, text?: string }` | Prefix icon/text |
| `suffix` | `{ icon: string, text?: string }` | Suffix icon/text |
| `options` | `Option[]` | Static options (select, radio, etc.) |
| `api` | `ApiConfig` | Dynamic options via API |
| `dependentOptions` | `DependentOptions` | Local cascading options |

### Supported `ControlType`

`text` · `number` · `email` · `password` · `tel` · `url` · `color` · `time` · `week` · `month` · `textarea` · `date` · `select` · `autocomplete` · `checkbox` · `checkbox-multiple` · `radio` · `switch` · `file` · `form-array`

---

## 🧩 `form-array` — Repeating groups

Render a collapsible, repeating sub-form inside any group. Each item is its own `FormGroup`; the whole array is a `FormArray`. On submit, the array is serialized as **a single JSON string** under the field's name, keeping the existing flat-FormData contract that .NET 9 (and `json-server`) understand.

### Example

```typescript
{
  type: 'form-array',
  name: 'cuentasBancarias',
  label: 'Cuentas bancarias',
  minItems: 1,
  itemTitle: 'Cuenta #{{index}} - {{banco}}',
  addButtonLabel: 'Agregar cuenta',
  removeButtonLabel: 'Quitar cuenta',
  confirmRemoveMessage: '¿Está seguro de que desea eliminar esta cuenta?',
  defaultItem: { pais: 'AR', moneda: 'ARS' },
  fields: [
    { type: 'text', label: 'Banco',       name: 'banco',   gridCols: 6, validations: { required: true } },
    { type: 'text', label: 'Nº de cuenta', name: 'numero',  gridCols: 6, validations: { required: true } },
    { type: 'select', label: 'País',       name: 'pais',    gridCols: 4,
      options: [{label:'Argentina',value:'AR'},{label:'Brasil',value:'BR'},{label:'Chile',value:'CL'}] },
    { type: 'select', label: 'Moneda',     name: 'moneda',  gridCols: 4,
      dependentOptions: {
        field: 'pais',
        map: {
          AR: [{label:'Peso Argentino',value:'ARS'},{label:'Dólar',value:'USD'}],
          BR: [{label:'Real',value:'BRL'},{label:'Dólar',value:'USD'}],
          CL: [{label:'Peso Chileno',value:'CLP'}]
        }
      }
    },
    { type: 'switch', label: 'Principal',  name: 'principal', gridCols: 4 }
  ]
}
```

### Field reference

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| `type` | `'form-array'` | ✅ | Discriminator |
| `name` | `string` | ✅ | Form control key; submitted as one FormData entry |
| `label` | `string` | ✅ | Section label shown above the array |
| `fields` | `FieldConfig[]` | ✅ | Inner fields rendered per item |
| `gridCols` | `number` | ❌ | 1–12 grid columns (default: 12) |
| `minItems` | `number` | ❌ | Non-negative int (default `0`). Adds `Validators.minLength` to the `FormArray`; the form is invalid below this count |
| `itemTitle` | `string` | ❌ | Per-item panel title. Supports `{{index}}` (1-based) and `{{fieldName}}` (any child field's current value). Unknown tokens pass through verbatim |
| `defaultItem` | `Record<string, any>` | ❌ | Pre-filled values for newly-added items (per inner-field `name`) |
| `addButtonLabel` | `string` | ❌ | Override for the global `formArray.addItem` translation |
| `removeButtonLabel` | `string` | ❌ | Override for the global `formArray.removeItem` translation |
| `confirmRemoveMessage` | `string` | ❌ | Override for the global `formArray.confirmRemoveItem` translation |

### Behavior

- **Add** appends a new item with `defaultItem` values pre-applied; the new panel is auto-expanded.
- **Remove** opens a `ConfirmationDialogComponent`; on confirm, the item is removed.
- **Collapse / expand** each item via the `mat-expansion-panel` header.
- **Per-item `visibleIf`** resolves against the **item's own FormGroup** (no `../` parent reference in v1).
- **Per-item `dependentOptions` and `api.dependsOn`** resolve against the **item's own FormGroup** (free — `FieldComponent` already takes a `FormGroup` as `@Input`).
- **Submission** emits a single `FormData` entry, e.g. `cuentasBancarias = '[{"banco":"Galicia","pais":"AR","moneda":"ARS"}]'`.
- **Edit-mode population** reads `initialData[name]` as an **array** and creates one `FormGroup` per entry.
- **Backwards compatibility** — existing configs without `form-array` keep working unchanged; `FieldConfig` is widened to a 4-way union with no break at call sites that already use `field.type` narrowing.

### v1 scope limits

- ❌ No `maxItems` cap
- ❌ No drag-and-drop reorder
- ❌ No nested `form-array` (an item MUST NOT contain another `form-array`)
- ❌ No `../` parent reference in `visibleIf`
- ❌ No deleted-items tracking (`_arrayName_deleted`)
- ❌ No per-item custom validators
- ❌ `type: 'file'` inside an item is **silently skipped** (no control created, not rendered)

### i18n keys

The `formArray` namespace is part of `DynamicFormsTranslations` (Spanish defaults; provide your own `provideDynamicFormsTranslations` for English or any other language):

| Key | Spanish default |
|---|---|
| `formArray.addItem` | `Agregar` |
| `formArray.removeItem` | `Eliminar` |
| `formArray.itemTitle` | `Elemento {{index}}` |
| `formArray.minItemsError` | `Mínimo {min} elemento(s) requerido(s).` |
| `formArray.confirmRemoveItem` | `¿Está seguro de que desea eliminar este elemento?` |

---

## 🎨 Theming

```typescript
import { ThemeService } from '@dynamic-forms-lib/core';

// In your component
private theme = inject(ThemeService);

// Toggle modes
this.theme.setMode('dark');
this.theme.setMode('light');
this.theme.setMode('system');

// Change palette
this.theme.setPalette('azure-palette');   // 12 palettes available

// Change AG Grid theme
this.theme.setAgGridTheme('quartz');       // alpine, material, balham, quartz
```

**Available palettes:** Red, Green, Blue, Yellow, Cyan, Magenta, Orange, Chartreuse, Spring Green, Azure, Violet, Rose

You can also override the default form field appearance globally:

```typescript
import { FORM_FIELD_APPEARANCE_TOKEN } from '@dynamic-forms-lib/core';

providers: [
  { provide: FORM_FIELD_APPEARANCE_TOKEN, useValue: 'outline' }
]
```

---

## 🖥️ Layout Examples

### Tabs layout

```typescript
const config = {
  layout: 'tabs',
  groups: [
    { label: 'General', type: 'tabs', fields: [...] },
    { label: 'Advanced', type: 'tabs', fields: [...] }
  ]
};
```

### Stepper (wizard) layout

```typescript
const config = {
  layout: 'steps',
  stepper: { linear: true, orientation: 'horizontal' },
  groups: [
    { label: 'Step 1', type: 'simple', fields: [...] },
    { label: 'Step 2', type: 'simple', fields: [...] }
  ]
};
```

### Accordion layout

```typescript
const config = {
  layout: 'accordion',
  groups: [
    { label: 'Section A', type: 'accordion', fields: [...] },
    { label: 'Section B', type: 'accordion', fields: [...] }
  ]
};
```

---

## 🗺️ Roadmap

- [ ] Unit tests
- [ ] Custom field types (extensibility API)
- [ ] Input masking
- [ ] Async validation
- [ ] Custom validators
- [ ] Stackblitz live demo
- [ ] Angular 21 Signal Forms integration
- [x] i18n / Translations (v0.1.2)
- [x] Form arrays / dynamic rows (`form-array` field type, v1)

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT © [José Manuel Vargas](https://github.com/JOMAVARGAS01) — DmdIntersoft

---

> **Built for enterprise Angular teams who need to ship CRUD screens fast.**
