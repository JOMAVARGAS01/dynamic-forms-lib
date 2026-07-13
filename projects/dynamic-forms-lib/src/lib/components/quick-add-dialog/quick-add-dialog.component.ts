import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { Option } from '../../types/dynamic-form.types';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';

export interface QuickAddConfig {
  resource: string;
  label?: string;
  /** Fields to show in the dialog. Defaults to [{ name: 'name', label: 'Nombre', required: true }] */
  fields?: QuickAddField[];
}

export interface QuickAddField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number';
  required?: boolean;
  placeholder?: string;
}

@Component({
  selector: 'app-quick-add-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogTitle, MatDialogContent, MatDialogActions,
    MatFormFieldModule, MatInputModule, MatButtonModule,
  ],
  templateUrl: './quick-add-dialog.component.html',
  styles: [`
    .quick-add-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .full-width {
      width: 100%;
    }
    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 8px;
    }
  `],
})
/**
 * Inline resource creation dialog. POSTs a new resource to `/{resource}` and
 * returns the created Option on close, or undefined on cancel.
 */
export class QuickAddDialogComponent {
  form = new FormGroup({});
  isSubmitting = false;
  errorMessage = '';
  fields: QuickAddField[] = [];

  private dialogRef = inject(MatDialogRef<QuickAddDialogComponent, Option | undefined>);
  private http = inject(HttpClient);
  public data!: QuickAddConfig;

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  constructor() {
    this.data = inject<QuickAddConfig>(MAT_DIALOG_DATA);
    
    // Default fields if none provided
    this.fields = this.data.fields ?? [
      { name: 'name', label: 'Nombre', type: 'text', required: true }
    ];

    // Build form controls dynamically
    for (const field of this.fields) {
      this.form.addControl(
        field.name,
        new FormControl('', {
          nonNullable: true,
          validators: field.required !== false ? Validators.required : []
        })
      );
    }
  }

  submit() {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    // Build payload from form values
    const payload: Record<string, any> = {};
    for (const field of this.fields) {
      const value = this.form.get(field.name)?.value;
      if (value !== null && value !== undefined && value !== '') {
        payload[field.name] = value;
      }
    }

    this.http.post<Option>(`/${this.data.resource}`, payload).subscribe({
      next: (created) => {
        // Return the created option with name as label
        const nameValue = payload['name'] || payload['Name'] || '';
        this.dialogRef.close({ label: created.label ?? nameValue, value: created.value ?? created });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message ?? 'Error al crear el registro.';
      },
    });
  }

  cancel() {
    this.dialogRef.close(undefined);
  }
}
