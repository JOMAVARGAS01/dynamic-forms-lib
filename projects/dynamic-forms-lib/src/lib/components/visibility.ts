import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BaseField, FieldConfig, FormArrayField, NonArrayControlType } from '../types/dynamic-form.types';

/**
 * Module-private helpers shared by `FormsComponent` and `FormArrayComponent`.
 * Kept here (not exported from `public-api.ts`) so the library surface stays
 * unchanged — only the behaviour changes.
 *
 * - `buildItemFormGroup` produces a FormGroup for one item of a `form-array`,
 *   honouring `defaultItem` / `initialData` values, silently skipping `file`
 *   fields and any nested `form-array` (v1 does not support nesting).
 * - `applyVisibility` is the single source of truth for `visibleIf` resolution
 *   + control enable/disable; runs at root and at item scope with the same
 *   semantics.
 * - `normalizeDates` mirrors the root `onSubmit` date formatting (yyyy-MM-dd)
 *   when serializing a FormArray as JSON so backend parsers stay consistent.
 */

const NON_ARRAY_FIELD_TYPES: ReadonlySet<NonArrayControlType> = new Set<NonArrayControlType>([
  'text', 'number', 'email', 'select', 'date', 'checkbox', 'checkbox-multiple',
  'textarea', 'switch', 'file', 'autocomplete', 'password', 'radio', 'color',
  'month', 'tel', 'time', 'url', 'week'
]);

/**
 * Builds a `FormGroup` for one item of a `form-array` (or one entry in
 * `initialData`). Skips `type: 'file'` (no control created) and `type: 'form-array'`
 * (v1 does not support nesting). When `initialValues` is provided, the
 * corresponding inner field is pre-filled; otherwise the field's static `value`
 * is used. Returns a `FormGroup` with the same validator set the root form would
 * produce for those fields (required, minLength, pattern, email, number min/max).
 */
export function buildItemFormGroup(
  fb: FormBuilder,
  fields: FieldConfig[],
  initialValues?: Record<string, any>
): FormGroup {
  const controls: Record<string, any> = {};

  fields.forEach(field => {
    // v1 skips: file (no control), and nested form-array (not supported).
    if (field.type === 'file' || field.type === 'form-array') return;

    const valueSource = initialValues !== undefined
      ? initialValues[field.name]
      : field.value;

    let initialValue: any = valueSource ?? null;

    if (field.type === 'checkbox-multiple') {
      initialValue = Array.isArray(valueSource) ? valueSource : [];
    } else if (field.type === 'checkbox' || field.type === 'switch') {
      initialValue = valueSource === 'false' ? false : !!valueSource;
    } else if (field.type === 'date' && valueSource) {
      initialValue = parseDateValue(valueSource);
    } else if (field.type === 'radio' && field.validations?.required && !valueSource) {
      const options = (field as any).options;
      if (options && options.length > 0) {
        initialValue = options[0].value;
      }
    } else if (field.type === 'select' && field.validations?.required && !valueSource) {
      const selectField = field as any;
      if (!selectField.api && selectField.options && selectField.options.length > 0) {
        initialValue = selectField.options[0].value;
      }
    }

    const validators: ValidatorFn[] = [];
    if (field.validations?.required) validators.push(Validators.required);
    if (field.validations?.minLength) validators.push(Validators.minLength(field.validations.minLength));
    if (field.validations?.pattern) validators.push(Validators.pattern(field.validations.pattern));
    if (field.type === 'email') validators.push(Validators.email);
    if (field.type === 'number' && field.validations?.min !== undefined) {
      validators.push(Validators.min(field.validations.min));
    }
    if (field.type === 'number' && field.validations?.max !== undefined) {
      validators.push(Validators.max(field.validations.max));
    }

    controls[field.name] = [initialValue, validators];
  });

  return fb.group(controls);
}

/**
 * Resolves `visibleIf` for each field in `fields` against `formGroup`'s current
 * values, mutates `visibilityMap` in place (one entry per field name), and
 * enables/disables the corresponding controls. Matches the existing root
 * `updateVisibility` semantics: hidden fields are disabled with
 * `emitEvent: false` (no recursive valueChanges), readonly fields are not
 * auto-enabled. Safe to call repeatedly.
 */
export function applyVisibility(
  formGroup: FormGroup,
  fields: FieldConfig[],
  visibilityMap: Record<string, boolean>
): void {
  const currentValues = formGroup.getRawValue();

  fields.forEach(field => {
    // form-array fields don't carry per-control visibility — skip them here.
    // Items handle their own visibility via FormArrayComponent.
    if (field.type === 'form-array') return;

    // `visibleIf` and `readonly` live on BaseField; SelectField/TextField
    // extend BaseField so this cast is safe. FormArrayField is already
    // excluded above.
    const scoped = field as BaseField;
    let isVisible = true;

    if (scoped.visibleIf) {
      const triggerValue = currentValues[scoped.visibleIf.field];
      const expectedValue = scoped.visibleIf.value;
      if (typeof expectedValue === 'boolean') {
        isVisible = !!triggerValue === expectedValue;
      } else {
        isVisible = triggerValue === expectedValue;
      }
    }

    visibilityMap[field.name] = isVisible;

    const control = formGroup.get(field.name);
    if (control && field.type !== 'file') {
      if (isVisible) {
        if (!scoped.readonly) {
          control.enable({ emitEvent: false });
        }
      } else {
        control.disable({ emitEvent: false });
      }
    }
  });
}

/**
 * Recursively normalises Date instances to yyyy-MM-dd strings. Used when
 * serializing a `FormArray` as a JSON string so the backend receives the
 * same date format the root form produces.
 */
export function normalizeDates(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return value;
    const year = value.getFullYear();
    const month = ('0' + (value.getMonth() + 1)).slice(-2);
    const day = ('0' + value.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      out[key] = normalizeDates(value[key]);
    }
    return out;
  }
  return value;
}

/** Builds the array-level validator (only when `minItems > 0`). */
export function buildFormArrayValidators(field: FormArrayField): ValidatorFn[] {
  const minItems = field.minItems ?? 0;
  return minItems > 0 ? [Validators.minLength(minItems)] : [];
}

/** Re-export of FormArray / FormGroup so callers don't need a second import. */
export type { FormArray, FormGroup };

/** Guard for runtime narrowing of FormArray in the host form. */
export function isFormArray(control: any): control is FormArray {
  return control instanceof FormArray;
}

/** Type-only assertion that a field is a FormArrayField at runtime. */
export function asFormArrayField(field: FieldConfig): FormArrayField {
  // The template's `@if (field.type === 'form-array')` guarantees this; the
  // runtime guard is a defensive fallback for direct programmatic use.
  if (field.type !== 'form-array') {
    throw new Error(`Expected FormArrayField, got ${field.type}`);
  }
  return field as FormArrayField;
}

/** Set of field types allowed inside a form-array item (file + form-array are skipped). */
export const ITEM_ALLOWED_TYPES = NON_ARRAY_FIELD_TYPES;

/** Mirrors the root form's `parseDate` semantics for `defaultItem` / `initialData`. */
function parseDateValue(value: any): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return value ? new Date(value) : null;
}
