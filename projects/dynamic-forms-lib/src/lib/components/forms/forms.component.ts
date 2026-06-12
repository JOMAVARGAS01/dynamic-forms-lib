import { Component, Input, Output, EventEmitter, inject, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormConfig, FieldConfig, FormFieldAppearance, FORM_FIELD_APPEARANCE_TOKEN } from '../../types/dynamic-form.types';
import { FieldComponent } from '../field/field.component';

@Component({
  selector: 'app-forms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTabsModule, MatExpansionModule, MatStepperModule, MatButtonModule, MatCardModule, MatIconModule, MatTooltipModule,
    FieldComponent
  ],
  styleUrls: ['./forms.component.css'],
  templateUrl: './forms.component.html'
})
export class FormsComponent implements OnInit {
  @Input({ required: true }) config!: FormConfig;
  @Input() mode: 'add' | 'edit' = 'add';
  @Input() initialData: Record<string, any> | null = null;
  private defaultAppearance = inject(FORM_FIELD_APPEARANCE_TOKEN);
  @Input() appearance: FormFieldAppearance = this.defaultAppearance;

  @Output() formSubmit = new EventEmitter<FormData>();
  @Output() cancel = new EventEmitter<void>();
  public allExpanded: boolean = true;
  public initialExpansionState: boolean = false;

  fb = inject(FormBuilder);
  form!: FormGroup;
  // groupForms: map each group to a FormGroup that references the root controls
  // groupForms removed to prevent control reparenting issues
  groupEntries: Array<{ group: any; key: string; isLast?: boolean }> = [];
  files = new Map<string, File>();
  visibilityMap = signal<Record<string, boolean>>({});
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.buildForm();
    if (this.initialData) {
      this.patchForm(this.initialData);
    }
    this.setupVisibilityLogic();
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

        controls[field.name] = [initialValue, validators];
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
        if (value !== undefined) {
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
    // Use getRawValue() to include disabled controls' values
    const currentValues = this.form.getRawValue();
    const newVisibilityMap: Record<string, boolean> = {};

    this.config.groups.forEach(group => {
      group.fields.forEach(field => {
        let isVisible = true;

        if (field.visibleIf) {
          const triggerValue = currentValues[field.visibleIf.field];
          const expectedValue = field.visibleIf.value;

          // Handle boolean comparisons properly (for switch/checkbox fields)
          if (typeof expectedValue === 'boolean') {
            isVisible = !!triggerValue === expectedValue;
          } else {
            isVisible = triggerValue === expectedValue;
          }
        }

        newVisibilityMap[field.name] = isVisible;

        // Disable/Enable control based on visibility to prevent validation issues
        const control = this.form.get(field.name);
        if (control && field.type !== 'file') {
          if (isVisible) {
            // Skip enable for readonly fields (managed via field.value = {value: X, disabled: true})
            if (!field.readonly) {
              control.enable({ emitEvent: false });
            }
          } else {
            control.disable({ emitEvent: false });
          }
        }
      });
    });

    this.visibilityMap.set(newVisibilityMap);
    this.cdr.markForCheck();
  }

  isVisible(field: FieldConfig): boolean {
    return this.visibilityMap()[field.name] ?? true;
  }

  onFileChange(event: { name: string; file: File }) {
    this.files.set(event.name, event.file);
  }

  // Check if form has any invalid ENABLED controls (visible fields only)
  get isFormInvalid(): boolean {
    return Object.keys(this.form.controls).some(key => {
      const control = this.form.get(key);
      return control && control.invalid && control.enabled;
    });
  }

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

      console.warn('Formulario inválido. Por favor, revise los campos marcados.');
      console.warn('Campos inválidos:', invalidFields);
      return;
    }

    const formData = new FormData();

    Object.keys(this.form.controls).forEach(key => {
      let val = this.form.get(key)?.value;
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

    this.formSubmit.emit(formData);
  }

  isGroupValid(group: any): boolean {
    // Check if any visible field in the group is invalid
    return !group.fields.some((field: any) => {
      // Only check validation if the field is visible
      if (!this.isVisible(field)) return false;

      const control = this.form.get(field.name);
      return control ? control.invalid : false;
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
