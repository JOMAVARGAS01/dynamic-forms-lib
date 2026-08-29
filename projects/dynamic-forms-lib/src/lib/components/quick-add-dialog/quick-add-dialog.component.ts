import { Component, inject, ChangeDetectionStrategy, computed, ViewChild, ViewContainerRef, ComponentRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Option, FormConfig } from '../../types/dynamic-form.types';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';
import { FormConfigRegistry } from '../../services/form-config-registry.service';

export interface QuickAddConfig {
  resource: string;
  label?: string;
  /** Full API URL to POST to. */
  url?: string;
  /** Fields to show in the dialog. Defaults to [{ name: 'name', label: 'Nombre', required: true }] */
  fields?: QuickAddField[];
  /**
   * FormConfig completo para el dialog. Si viene, reemplaza al del
   * FormConfigRegistry — permite pasar un config con la empresa/locale
   * ACTUALES (el registry es estático, empresa 1).
   */
  formConfig?: FormConfig;
  /** Datos iniciales para pre-cargar el form en modo add (p.ej. el activo
   * en un form-array). Se aplica en el ngOnInit del FormsComponent. */
  initialData?: Record<string, any>;
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
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
  ],
  templateUrl: './quick-add-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
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
    .form-host {
      width: 100%;
    }
    mat-dialog-content {
      max-height: 60vh;
      overflow-y: auto;
    }
  `],
})
/**
 * Inline resource creation dialog. POSTs a new resource to `/{resource}` and
 * returns the created Option on close, or undefined on cancel.
 *
 * If a FormConfig is registered for the resource, dynamically creates
 * FormsComponent to show the full form (avoids circular dependency).
 */
export class QuickAddDialogComponent implements AfterViewInit {
  form = new FormGroup({});
  isSubmitting = false;
  errorMessage = '';
  fields: QuickAddField[] = [];

  /** The full FormConfig if registered, otherwise null. */
  fullFormConfig: FormConfig | null = false as any; // null = not checked yet
  private formComponentRef: ComponentRef<any> | null = null;

  @ViewChild('formHost', { read: ViewContainerRef }) formHost!: ViewContainerRef;

  /** Resolved POST URL. */
  private get postUrl(): string {
    return this.data.url ?? `/${this.data.resource}`;
  }

  private dialogRef = inject(MatDialogRef<QuickAddDialogComponent, Option | undefined>);
  private http = inject(HttpClient);
  private registry = inject(FormConfigRegistry);
  public data!: QuickAddConfig;

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  constructor() {
    this.data = inject<QuickAddConfig>(MAT_DIALOG_DATA);

    // Check if a full FormConfig is registered for this resource (o viene
    // directo en la config — caso del quickAdd con empresa/locale actuales).
    const registered = this.data.formConfig ?? this.registry.get(this.data.resource);
    if (registered) {
      this.fullFormConfig = registered;
      return; // Skip simple field setup — form loaded dynamically in ngAfterViewInit
    }

    this.fullFormConfig = null;

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

  async ngAfterViewInit() {
    if (this.fullFormConfig && this.formHost) {
      // Dynamic import to break circular dependency
      const { FormsComponent } = await import('../forms/forms.component');
      this.formHost.clear();
      this.formComponentRef = this.formHost.createComponent(FormsComponent);
      this.formComponentRef.instance.config = this.fullFormConfig;
      this.formComponentRef.instance.mode = 'add';
      this.formComponentRef.instance.initialData = this.data.initialData ?? null;
      // El dialog expone su PROPIO footer fijo (Guardar/Cancelar siempre
      // visibles) — se oculta el footer interno del form para no duplicar
      // botones ni obligar a scrollear para guardar.
      this.formComponentRef.instance.hideFooter = true;
      this.formComponentRef.instance.formSubmit.subscribe((formData: FormData) => this.onFullFormSubmit(formData));
      this.formComponentRef.instance.cancel.subscribe(() => this.cancel());
    }
  }

  /** Called when FormsComponent emits formSubmit (full form mode). */
  onFullFormSubmit(formData: FormData) {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    // Convierte el FormData plano a JSON (contrato del BE [FromBody]):
    // los form-array ya viajan como JSON string (p.ej. 'activos').
    const payload: Record<string, any> = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    this.http.post<Option>(this.postUrl, payload).subscribe({
      next: (created) => {
        const nameValue = formData.get('name') || formData.get('Name') || '';
        this.dialogRef.close({ label: String(created.label ?? nameValue), value: created.value ?? created });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message ?? 'Error al crear el registro.';
      },
    });
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

    this.http.post<Option>(this.postUrl, payload).subscribe({
      next: (created) => {
        const nameValue = payload['name'] || payload['Name'] || '';
        this.dialogRef.close({ label: created.label ?? nameValue, value: created.value ?? created });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message ?? 'Error al crear el registro.';
      },
    });
  }

  /** Botón Guardar del footer fijo del dialog: en modo form completo delega
   *  en el onSubmit del FormsComponent (valida y emite formSubmit); en modo
   *  fields usa el submit simple. */
  onGuardar() {
    if (this.fullFormConfig) {
      this.formComponentRef?.instance.onSubmit();
    } else {
      this.submit();
    }
  }

  cancel() {
    this.dialogRef.close(undefined);
  }
}
