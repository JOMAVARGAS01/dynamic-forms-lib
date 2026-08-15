import { Component, Input, Output, EventEmitter, inject, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef, Optional, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormConfig, FieldConfig, FormArrayField, FormFieldAppearance, FORM_FIELD_APPEARANCE_TOKEN } from '../../types/dynamic-form.types';
import { FieldComponent } from '../field/field.component';
import { FormArrayComponent } from '../form-array/form-array.component';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';
import { applyVisibility, buildFormArrayValidators, buildItemFormGroup, isFormArray, normalizeDates } from '../visibility';
import { normalizeFormConfig } from './layout';

@Component({
  selector: 'app-forms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTabsModule, MatExpansionModule, MatStepperModule, MatButtonModule, MatCardModule, MatIconModule, MatTooltipModule,
    FieldComponent,
    FormArrayComponent
  ],
  styleUrls: ['./forms.component.css'],
  templateUrl: './forms.component.html'
})
/**
 * Dynamic form renderer that builds a reactive FormGroup from a FormConfig.
 * Supports field types (text, select, autocomplete, checkbox, date, file, etc.),
 * validation, conditional visibility (visibleIf), and file attachments.
 */
export class FormsComponent implements OnInit {
  /** Form configuration defining groups, fields, and layout. */
  @Input({ required: true }) config!: FormConfig;
  /** Form mode: 'add' for new records, 'edit' for existing ones. */
  @Input() mode: 'add' | 'edit' = 'add';
  /** Initial data to patch into the form when in edit mode. */
  @Input() initialData: Record<string, any> | null = null;
  private defaultAppearance = inject(FORM_FIELD_APPEARANCE_TOKEN);

  /** Material appearance style for form fields (outline, fill, legacy, standard). */
  @Input() appearance: FormFieldAppearance = this.defaultAppearance;

  /** Emits the collected FormData when the form is submitted. */
  @Output() formSubmit = new EventEmitter<FormData>();
  /** Emits when the user cancels the form. */
  @Output() cancel = new EventEmitter<void>();
  /** Whether all form groups are currently expanded in the template. */
  public allExpanded: boolean = true;
  /** Initial expansion state applied after the view initializes. */
  public initialExpansionState: boolean = false;

  fb = inject(FormBuilder);
  form!: FormGroup;
  // groupForms: map each group to a FormGroup that references the root controls
  // groupForms removed to prevent control reparenting issues
  groupEntries: Array<{ group: any; key: string; isLast?: boolean }> = [];
  files = new Map<string, File>();
  fileArrays = new Map<string, File[]>();
  visibilityMap = signal<Record<string, boolean>>({});
  private cdr = inject(ChangeDetectorRef);

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  ngOnInit() {
    // Normaliza el layout ANTES de construir el form: reagrupa los campos
    // de cada grupo en filas de 12 (estira el último de cada fila para
    // llenar el hueco). El config original del consumidor NO se muta
    // (normalizeFormConfig devuelve clones).
    this.config = normalizeFormConfig(this.config);
    this.buildForm();
    if (this.initialData) {
      this.patchForm(this.initialData);
    }
    this.setupVisibilityLogic();
    if (this.config.readonly) {
      this.form.disable();
    }
  }
  ngAfterViewInit(): void {
    this.allExpanded = this.initialExpansionState;
    this.cdr.markForCheck();
  }

  private buildForm() {
    const controls: Record<string, any> = {};

    // Build flat controls map (root form) so existing logic and dynamic options keep working
    this.config.groups.forEach(group => {
      group.fields.forEach(field => {
        if (field.type === 'file') return;
        if (field.type === 'file-array') return;

        if (field.type === 'form-array') {
          // form-array: the control is a FormArray, items are FormGroups built per field
          controls[field.name] = this.fb.array([], { validators: buildFormArrayValidators(field as FormArrayField) });
          return;
        }

        const validators = [];
        if (field.validations?.required) validators.push(Validators.required);
        if (field.validations?.minLength) validators.push(Validators.minLength(field.validations.minLength));
        if (field.validations?.pattern) validators.push(Validators.pattern(field.validations.pattern));

        if (field.type === 'email') validators.push(Validators.email);
        if (field.type === 'number' && field.validations?.min !== undefined) validators.push(Validators.min(field.validations.min));
        if (field.type === 'number' && field.validations?.max !== undefined) validators.push(Validators.max(field.validations.max));

        // initial value depending on type
        let initialValue: any = field.value ?? null;

        if (field.type === 'checkbox-multiple') {
          // must be an array
          initialValue = Array.isArray(field.value) ? field.value : [];
        } else if (field.type === 'checkbox' || field.type === 'switch') {
          // normalized boolean
          initialValue = field.value === 'false' ? false : !!field.value;
        } else if (field.type === 'date' && field.value) {
          // if provided as ISO string, try to convert to Date
          initialValue = this.parseDate(field.value);
        } else if (field.type === 'radio' && field.validations?.required && !field.value) {
          // For required radio buttons without initial value, set first option as default
          const options = (field as any).options;
          if (options && options.length > 0) {
            initialValue = options[0].value;
          }
        } else if (field.type === 'select' && field.validations?.required && !field.value) {
          // For required select fields without API and without initial value, set first option as default
          const selectField = field as any;
          if (!selectField.api && selectField.options && selectField.options.length > 0) {
            initialValue = selectField.options[0].value;
          }
        }

        // Readonly a nivel de control: un campo readonly se crea DESHABILITADO
        // para que TODOS los tipos de widget (switch, checkbox, radio, select,
        // inputs, date, time...) queden bloqueados vía ControlValueAccessor,
        // sin depender del atributo por-widget en el template.
        controls[field.name] = field.readonly
          ? [{ value: initialValue, disabled: true }, validators]
          : [initialValue, validators];
      });
    });

    // root form keeps flat controls to preserve existing behavior
    this.form = this.fb.group(controls);

    // Do NOT create subgroup views that reference the same controls,
    // as it detaches them from the root form. We will validate groups manually.

    // create entries for template iteration
    this.groupEntries = this.config.groups.map((g, i) => ({ group: g, key: `group_${i}`, isLast: i === this.config.groups.length - 1 }));
  }


  private patchForm(data: Record<string, any>) {
    const patchValue: Record<string, any> = {};

    this.config.groups.forEach(group => {
      group.fields.forEach(field => {
        const value = data[field.name];
        if (value === undefined) return;

        if (field.type === 'form-array') {
          // Per spec: initialData[name] is an array (no JSON.parse). One FormGroup per entry.
          const arrField = field as FormArrayField;
          const arr = this.form.get(field.name) as FormArray | null;
          if (!arr) return;
          if (Array.isArray(value)) {
            value.forEach((itemData: any) => {
              if (itemData && typeof itemData === 'object') {
                arr.push(buildItemFormGroup(this.fb, arrField.fields, itemData));
              }
            });
          }
          return;
        }

        if (field.type === 'file-array') return;

        if (field.type === 'date') {
          patchValue[field.name] = this.parseDate(value);
        } else if (field.type === 'checkbox' || field.type === 'switch') {
          patchValue[field.name] = (String(value).toLowerCase() === 'false') ? false : !!value;
        } else if (field.type === 'checkbox-multiple') {
          if (Array.isArray(value)) {
            patchValue[field.name] = value;
          } else if (typeof value === 'string') {
            patchValue[field.name] = value.split(',').map(v => v.trim()).filter(v => v !== '');
          } else {
            patchValue[field.name] = value ? [value] : [];
          }
        } else {
          patchValue[field.name] = value;
        }
      });
    });

    this.form.patchValue(patchValue);
    // Update visibility after patching to ensure it reflects the loaded data
    this.updateVisibility();
  }

  private setupVisibilityLogic() {
    this.form.valueChanges.subscribe((values) => {
      this.updateVisibility();
      this.cdr.markForCheck();
    });
    this.updateVisibility();
  }

  private updateVisibility() {
    const newVisibilityMap: Record<string, boolean> = {};

    this.config.groups.forEach(group => {
      // `form-array` fields don't have a single control: visibility is managed
      // inside `FormArrayComponent` per item. Skip them at the root.
      group.fields.forEach(field => {
        if (field.type === 'form-array') return;
        applyVisibility(this.form, [field], newVisibilityMap);
      });
    });

    this.visibilityMap.set(newVisibilityMap);
    this.cdr.markForCheck();
  }

  /** Checks if a given field is currently visible based on its visibleIf rules. */
  isVisible(field: FieldConfig): boolean {
    return this.visibilityMap()[field.name] ?? true;
  }

  /** Registers a file selected by a file input field. */
  onFileChange(event: { name: string; file: File }) {
    this.files.set(event.name, event.file);
  }

  /** Registers files from a file-array field. */
  onFileArrayChange(fieldName: string, files: File[]) {
    if (files.length > 0) {
      this.fileArrays.set(fieldName, files);
    } else {
      this.fileArrays.delete(fieldName);
    }
  }

  // Check if form has any invalid ENABLED controls (visible fields only).
  // For FormArray fields, recurse one level: the array's own validity
  // (which includes minLength) AND each item's inner FormGroup controls.
  get isFormInvalid(): boolean {
    return Object.keys(this.form.controls).some(key => {
      const control = this.form.get(key);
      if (!control) return false;
      if (isFormArray(control)) {
        if (control.invalid) return true;
        return (control.controls as FormGroup[]).some(item => this.hasInvalidEnabledControl(item));
      }
      return control.invalid && control.enabled;
    });
  }

  /** Walks a FormGroup's direct controls and returns true if any ENABLED control is invalid. */
  private hasInvalidEnabledControl(group: FormGroup): boolean {
    return Object.keys(group.controls).some(ctrlKey => {
      const inner = group.get(ctrlKey);
      return !!inner && inner.invalid && inner.enabled;
    });
  }

  /** Validates and submits the form. Only validates enabled (visible) controls. */
  onSubmit() {
    // Only validate enabled controls (visible fields)
    if (this.isFormInvalid) {
      this.form.markAllAsTouched();

      // Debug: Show which fields are invalid
      const invalidFields: string[] = [];
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control && control.invalid && control.enabled) {
          invalidFields.push(`${key} (errors: ${JSON.stringify(control.errors)})`);
        }
      });

      console.warn(this.t().form.invalidForm);
      console.warn(this.t().form.invalidFields, invalidFields);
      return;
    }

    const formData = new FormData();

    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (!control) return;

      // form-array: serialize as a single JSON string under the field's name.
      // Dates inside items are normalized to yyyy-MM-dd so backend parsers
      // stay consistent with the root form's date format.
      if (isFormArray(control)) {
        const serialized = JSON.stringify(normalizeDates(control.value));
        formData.append(key, serialized);
        return;
      }

      let val = control.value;
      // Ensure it's a valid date object
      if (val instanceof Date && !isNaN(val.getTime())) {
        const year = val.getFullYear();
        const month = ('0' + (val.getMonth() + 1)).slice(-2);
        const day = ('0' + val.getDate()).slice(-2);
        val = `${year}-${month}-${day}`;
      }

      if (val !== null && val !== undefined) {
        formData.append(key, val);
      }
    });

    this.files.forEach((file, key) => {
      formData.append(key, file);
    });

    this.fileArrays.forEach((files, key) => {
      files.forEach((file) => {
        formData.append(key, file);
      });
    });

    this.formSubmit.emit(formData);
  }

  /** Checks if all visible fields in a given group are valid. */
  isGroupValid(group: any): boolean {
    // Check if any visible field in the group is invalid
    return !group.fields.some((field: any) => {
      // Only check validation if the field is visible
      if (!this.isVisible(field)) return false;

      const control = this.form.get(field.name);
      if (!control) return false;
      if (isFormArray(control)) {
        if (control.invalid) return true;
        return (control.controls as FormGroup[]).some(item => this.hasInvalidEnabledControl(item));
      }
      return control.invalid;
    });
  }

  private parseDate(value: any): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return value ? new Date(value) : null;
  }
}
