import { ValidatorFn } from '@angular/forms';
import { InjectionToken } from '@angular/core';

export type ControlType =
  | 'text'
  | 'number'
  | 'email'
  | 'select'
  | 'date'
  | 'checkbox'
  | 'checkbox-multiple'
  | 'textarea'
  | 'switch'
  | 'file'
  | 'autocomplete'
  | 'password'
  | 'radio'
  | 'color'
  | 'month'
  | 'tel'
  | 'time'
  | 'url'
  | 'week'
  | 'form-array'
  | 'file-array';

/** ControlType union excluding the 'form-array' literal. Used by `BaseField` so that
 *  TypeScript narrowing via `field.type === 'form-array'` correctly isolates `FormArrayField`. */
export type NonArrayControlType = Exclude<ControlType, 'form-array'>;

// Configuración para llamadas API
export interface ApiConfig {
  endpoint: string;
  valueKey?: string;
  labelKey?: string;
  dependsOn?: string;
  queryParam?: string;
}

export interface Option { label: string; value: any }

export interface BaseField {
  type: NonArrayControlType;
  name: string;
  label: string;
  gridCols?: number;
  options?: Option[];
  value?: any;
  readonly?: boolean;
  prefix?: {
    icon: string;
    text?: string;
    isIcon?: boolean;
  };
  suffix?: {
    icon: string;
    text?: string;
    isIcon?: boolean;
  };
  visibleIf?: { field: string; value: any };
  validations?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface SelectField extends BaseField {
  type: 'select' | 'autocomplete';
  options?: Option[];
  api?: ApiConfig;
  dependentOptions?: {
    field: string;
    map: Record<string, Option[]>;
  };
  displayKey?: string;
  quickAdd?: {
    resource: string;
    label?: string;
    /** Full API URL to POST to. If omitted, derived from select field's api.endpoint. */
    url?: string;
    /** Fields to show in the quick-add dialog. Defaults to [{ name: 'name', label: 'Nombre', required: true }] */
    fields?: Array<{
      name: string;
      label: string;
      type?: 'text' | 'textarea' | 'number';
      required?: boolean;
      placeholder?: string;
    }>;
  };
}

export interface AutocompleteField extends BaseField {
  type: 'autocomplete';
  options?: Option[];
  api?: ApiConfig;
  displayKey?: string;
}

export interface TextField extends BaseField {
  type: 'text' | 'textarea' | 'email' | 'password' | 'color' | 'month' | 'tel' | 'time' | 'url' | 'week' | 'number';
}

/**
 * Collapsible repeating group of fields. Each item is a `FormGroup`; the whole array
 * is a `FormArray`. v1 scope: one level of nesting only (an item MUST NOT contain another
 * `form-array`); `visibleIf` inside an item resolves against the item's own FormGroup
 * (no `../` parent reference); `dependentOptions` and `api.dependsOn` resolve against
 * the item's FormGroup for free. On submit, the array is serialized as a single JSON
 * string under the field's name. `minItems` is a hard `Validators.minLength` on the
 * FormArray; the form is invalid below `minItems`. v1 has no `maxItems` cap.
 */
export interface FormArrayField {
  type: 'form-array';
  name: string;
  label: string;
  gridCols?: number;
  /** Inner fields rendered per item. Item-level `file` fields are silently skipped. */
  fields: FieldConfig[];
  /** Non-negative integer. When > 0, `Validators.minLength(minItems)` is applied to the FormArray. */
  minItems?: number;
  /** Optional per-item title template. Supports `{{index}}` (1-based) and `{{fieldName}}` tokens. */
  itemTitle?: string;
  /** Pre-filled values for newly-added items (per-field keys). */
  defaultItem?: Record<string, any>;
  /** Override the default add-button label (falls back to `t().formArray.addItem`). */
  addButtonLabel?: string;
  /** Override the default remove-button label (falls back to `t().formArray.removeItem`). */
  removeButtonLabel?: string;
  /** Confirmation dialog message (falls back to `t().formArray.confirmRemoveItem`). */
  confirmRemoveMessage?: string;
}

/** Multi-file upload field with thumbnail preview, per-file delete, and progress. */
export interface FileArrayField extends BaseField {
  type: 'file-array';
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  uploadUrl?: string;
}

export type FieldConfig = SelectField | TextField | BaseField | FormArrayField | FileArrayField;

/** Field config that can be rendered by `FieldComponent` — excludes `FormArrayField`,
 *  which is rendered by `FormArrayComponent` instead. Used to narrow the
 *  `FieldComponent.field` input so template type checks pass on `prefix`/`suffix`/
 *  `value`/etc. without `$any()` casts. */
export type RenderableFieldConfig = Exclude<FieldConfig, FormArrayField>;

export interface GroupConfig {
  label: string;
  type: 'tabs' | 'accordion' | 'simple';
  fields: FieldConfig[];
}

export interface FormConfig {
  layout?: string;
  groups: GroupConfig[];
  // Optional stepper configuration when using `layout: 'steps'`
  stepper?: {
    linear?: boolean;
    orientation?: 'horizontal' | 'vertical';
  };
}

export type FormFieldAppearance = 'fill' | 'outline';
export const FORM_FIELD_APPEARANCE: FormFieldAppearance = 'fill';

export const FORM_FIELD_APPEARANCE_TOKEN = new InjectionToken<FormFieldAppearance>(
  'Form field appearance',
  { factory: () => FORM_FIELD_APPEARANCE, providedIn: 'root' }
);
