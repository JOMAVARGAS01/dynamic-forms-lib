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
  | 'week';

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
  type: ControlType;
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

export type FieldConfig = SelectField | TextField | BaseField;

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
