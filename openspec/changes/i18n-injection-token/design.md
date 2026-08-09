# Design: i18n InjectionToken for dynamic-forms-lib

## Technical Approach

Add an `InjectionToken<Translations>` that components inject via `optional()` to get Spanish defaults. The token lives in `types/translations.ts`. Each component creates a `translations` getter that merges defaults with injected values. Templates access translations via direct property calls, not signals (translations don't change at runtime).

## Architecture Decisions

### Decision: Flat vs Nested Translation Keys

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Flat keys (`field.required`) | Simple, but no grouping | ✅ Chosen |
| Nested by component | Logical grouping, more verbose | ❌ Rejected |

**Rationale**: Flat keys are simpler to use and easier to merge with defaults. Component namespacing via prefix is sufficient.

### Decision: Signal-based vs Getter-based Access

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Signal `translations()` | Reactivity, but overkill for static data | ❌ Rejected |
| Getter `get t()` | Simple, no reactivity needed | ✅ Chosen |

**Rationale**: Translations don't change at runtime. A getter is simpler and avoids unnecessary signal overhead.

### Decision: Injection Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `inject(token)` required | Forces consumers to provide token | ❌ Rejected |
| `inject(token, { optional: true })` | Works without token, needs defaults | ✅ Chosen |

**Rationale**: Library must work without i18n token. Optional injection with Spanish defaults is the safest approach.

## Hardcoded Strings Inventory

### Field Component (`field.component.html` + `field.component.ts`)
- "Mostrar contraseña" / "Ocultar contraseña"
- "Cargando datos..." / "Buscando..."
- "No se encontraron resultados."
- "Seleccionar Archivo" / "Ningún archivo seleccionado"
- "Archivo requerido"
- Error messages: required, email, minlength, pattern, min, max, invalid

### Forms Component (`forms.component.ts`)
- "Formulario inválido. Por favor, revise los campos marcados."
- "Campos inválidos:"

### CrudManager Component (`crud-manager.component.html` + `.ts`)
- "Nuevo" / "Exportar" / "Buscar..."
- "Acciones" (column header)
- SnackBar messages: success/error for add, update, delete

### Confirmation Dialog (`confirmation-dialog.component.html`)
- "Confirmación" / "Cancelar" / "Aceptar"

### Action Cell (`action-cell.component.html`)
- "Editar Registro" / "Eliminar Registro"

## Interfaces / Contracts

```typescript
// types/translations.ts
export interface ValidationTranslations {
  required: string;
  email: string;
  minLength: string;    // Interpolation: {length}
  pattern: string;
  min: string;          // Interpolation: {min}
  max: string;          // Interpolation: {max}
  invalid: string;
}

export interface FieldTranslations {
  loading: string;
  searching: string;
  noResults: string;
  selectFile: string;
  noFileSelected: string;
  fileRequired: string;
  unsupportedField: string;  // Interpolation: {type}
  showPassword: string;
  hidePassword: string;
}

export interface FormTranslations {
  invalidForm: string;
  invalidFields: string;
}

export interface CrudTranslations {
  new: string;
  export: string;
  search: string;
  actions: string;
  addSuccess: string;
  addError: string;
  updateSuccess: string;
  updateError: string;
  deleteSuccess: string;
  deleteError: string;
  deleteErrorNoData: string;
  deleteErrorNoUrl: string;
  deleteErrorNoUrlConfig: string;
  confirmDelete: string;
}

export interface DialogTranslations {
  title: string;
  cancel: string;
  confirm: string;
}

export interface ActionCellTranslations {
  edit: string;
  delete: string;
}

export interface Translations {
  validation: ValidationTranslations;
  field: FieldTranslations;
  form: FormTranslations;
  crud: CrudTranslations;
  dialog: DialogTranslations;
  actionCell: ActionCellTranslations;
}

export const DYNAMIC_FORMS_TRANSLATIONS = new InjectionToken<Translations>(
  'Dynamic Forms Translations'
);

// Spanish defaults (used when token is not provided)
export const DEFAULT_TRANSLATIONS: Translations = { /* ... */ };
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `types/translations.ts` | Create | Translation interfaces, token, and Spanish defaults |
| `types/dynamic-form.types.ts` | Modify | Re-export token for backward compat |
| `components/field/field.component.ts` | Modify | Inject token, replace hardcoded strings |
| `components/forms/forms.component.ts` | Modify | Inject token, replace hardcoded strings |
| `components/crud-manager/crud-manager.component.ts` | Modify | Inject token, replace hardcoded strings |
| `components/confirmation-dialog/confirmation-dialog.component.ts` | Modify | Inject token, replace hardcoded strings |
| `components/action-cell/action-cell.component.ts` | Modify | Inject token, replace hardcoded strings |
| `public-api.ts` | Modify | Export new types and token |

## Component Injection Pattern

```typescript
// Pattern for each component:
import { inject, optional } from '@angular/core';
import { DYNAMIC_FORMS_TRANSLATIONS, DEFAULT_TRANSLATIONS } from '../../types/translations';

export class FieldComponent {
  private readonly translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true }) ?? DEFAULT_TRANSLATIONS;

  // For nested access in templates:
  get t() { return this.translations; }

  // For interpolation:
  getMinLengthMessage(length: number): string {
    return this.t.validation.minLength.replace('{length}', String(length));
  }
}
```

## Template Binding

Templates use the `t` getter for direct property access:

```html
<!-- Before -->
<span>Seleccionar Archivo</span>

<!-- After -->
<span>{{ t.field.selectFile }}</span>

<!-- With interpolation (in .ts method) -->
<span>{{ getMinLengthMessage(errors['minlength'].requiredLength) }}</span>
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Token not provided | Use `DEFAULT_TRANSLATIONS` (Spanish) |
| Key missing | Returns `undefined` — caller should handle with `?? ''` |
| Translation value empty | Display empty string (no fallback to key name) |

## Migration / Rollout

No migration required. All changes are backward-compatible. Existing consumers get Spanish defaults automatically. New consumers can provide the token for custom translations.

## Open Questions

- [ ] Should we add an `en` default translations object? (Not in scope for this change)
- [ ] Should we support pluralization? (Overkill for now)
- [ ] Should we use `@ngx-translate` instead? (No — keeps library dependency-free)
