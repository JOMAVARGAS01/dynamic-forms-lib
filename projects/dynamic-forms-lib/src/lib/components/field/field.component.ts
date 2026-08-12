import { Component, Input, Output, EventEmitter, inject, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef, Optional, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { switchMap, startWith, tap, catchError, map, debounceTime, distinctUntilChanged } from 'rxjs';
import { of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldConfig, SelectField, BaseField, ChipsField, RenderableFieldConfig, FORM_FIELD_APPEARANCE } from '../../types/dynamic-form.types';
import { DynamicOptionsService } from '../../services/dynamic-options.service';
import { FormConfigRegistry } from '../../services/form-config-registry.service';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';
import { MatRadioModule } from '@angular/material/radio';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { FileArrayComponent } from '../file-array/file-array.component';
import { QuickAddDialogComponent } from '../quick-add-dialog/quick-add-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

type Option = { label: string, value: any, disabled?: boolean };

@Component({
  selector: 'app-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatSlideToggleModule, MatDatepickerModule, MatNativeDateModule,
    MatOptionModule, MatButtonModule, MatProgressSpinnerModule,
    MatAutocompleteModule, MatIconModule, MatTooltipModule, MatRadioModule,
    MatTimepickerModule, MatChipsModule, FileArrayComponent, MatDialogModule
  ],
  styleUrls: ['./field.component.css'],
  templateUrl: './field.component.html'
})
/**
 * Single field renderer for dynamic forms.
 * Renders one form field based on a FieldConfig type (text, select, autocomplete,
 * checkbox, switch, radio, date, file, etc.) with dynamic API-loaded options and cascading support.
 */
export class FieldComponent implements OnInit {
  /** Configuration for this field (type, name, validations, options, etc.). */
  @Input({ required: true }) field!: RenderableFieldConfig;
  /** Material appearance style for the form field (outline, fill, legacy, standard). */
  @Input({ required: true }) appearance: typeof FORM_FIELD_APPEARANCE = FORM_FIELD_APPEARANCE;
  /** The parent FormGroup this field is bound to. */
  @Input({ required: true }) form!: FormGroup;

  /** Emits when a file is selected, containing the field name and File object. */
  @Output() fileChange = new EventEmitter<{ name: string; file: File }>();
  /** Emits when file-array files change, containing the full File array. */
  @Output() fileArrayChange = new EventEmitter<File[]>();

  private optionsService = inject(DynamicOptionsService);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private formConfigRegistry = inject(FormConfigRegistry);

  /** Options loaded from a dynamic API source for select/autocomplete fields. */
  apiOptions = signal<Option[]>([]);
  /** Whether dynamic options are currently being fetched. */
  isLoadingOptions = signal<boolean>(false);
  /** Displayed filename for file input fields. */
  fileName = signal<string>('');

  filteredOptions = signal<Option[]>([]);
  allOptions = signal<Option[]>([]);

  private isFilterSetup = false;
  private isFirstTrigger = true;
  hidePassword = signal<boolean>(true);
  private cdr = inject(ChangeDetectorRef);

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  ngOnInit() {
    this.setupDynamicOptions();
    this.setupTimeField();
  }

  // ── Time field: matTimepicker usa [value]=Date, no [formControl] ──

  /** Date value for matTimepicker binding. Synced with FormControl. */
  timeValue = signal<Date>(new Date(0, 0, 0, 0, 0));

  private setupTimeField(): void {
    if (this.field.type !== 'time') return;
    const control = this.form.get(this.field.name);
    if (!control) return;

    // Initial: FormControl string → Date
    const initial = control.value;
    if (typeof initial === 'string' && initial.includes(':')) {
      this.timeValue.set(this._parseTime(initial));
    }

    // FormControl changes (e.g., patchValue from grid data) → Date
    control.valueChanges.pipe(distinctUntilChanged()).subscribe(val => {
      if (typeof val === 'string' && val.includes(':')) {
        this.timeValue.set(this._parseTime(val));
        this.cdr.markForCheck();
      }
    });
  }

  /** User selected a time → Date → "HH:mm:ss" string → FormControl. */
  onTimeValueChange(val: Date) {
    const control = this.form.get(this.field.name);
    if (!control) return;
    const hh = String(val.getHours()).padStart(2, '0');
    const mm = String(val.getMinutes()).padStart(2, '0');
    control.setValue(`${hh}:${mm}:00`, { emitEvent: false });
    this.timeValue.set(val);
    control.markAsTouched();
    control.markAsDirty();
    this.cdr.markForCheck();
  }

  /** "HH:mm:ss" → Date using local hours (timezone-safe for display). */
  private _parseTime(time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(0, 0, 0, h, m);
    return d;
  }

  private setupDynamicOptions() {
    const f = this.field as SelectField;
    const staticOpts = this.getStaticOptions();
    this.allOptions.set(staticOpts);
    this.filteredOptions.set(staticOpts);

    if (f.type === 'select' || f.type === 'autocomplete' || f.type === 'chips') {
      const apiConfig = f.api;
      const dependentConfig = f.dependentOptions;

      if (apiConfig) {
        const controlToWatch = apiConfig.dependsOn ? this.form.get(apiConfig.dependsOn) : null;

        const trigger$ = controlToWatch
          ? controlToWatch.valueChanges.pipe(startWith(controlToWatch.value))
          : of(null);

        trigger$.pipe(
          tap(() => this.isLoadingOptions.set(true)),
          switchMap(depValue => {
            const control = this.form.get(this.field.name);

            if (f.type === 'select' && apiConfig.dependsOn && !this.isFirstTrigger && control?.value) {
              control.setValue(null);
            }

            return this.optionsService.fetchOptions(apiConfig, depValue).pipe(
              catchError(() => of([] as Option[]))
            );
          }),
          tap(() => this.isLoadingOptions.set(false))
        ).subscribe(options => {
          this.handleNewOptions(options, staticOpts);
        });
      } else if (dependentConfig) {
        const controlToWatch = this.form.get(dependentConfig.field);
        if (!controlToWatch) return;

        controlToWatch.valueChanges.pipe(
          startWith(controlToWatch.value)
        ).subscribe(val => {
          const control = this.form.get(this.field.name);

          // Clear value if parent changes (skip on first run)
          if (!this.isFirstTrigger && control?.value) {
            control.setValue(null);
          }

          const options = dependentConfig.map[val] || [];
          this.handleNewOptions(options, staticOpts);
        });
      }
    }
  }

  private handleNewOptions(options: Option[], staticOpts: Option[]) {
    this.apiOptions.set(options);
    const combined = staticOpts.concat(options);
    this.allOptions.set(combined);
    this.filteredOptions.set(combined);

    const f = this.field as SelectField | ChipsField;
    if (f.type === 'autocomplete') {
      this.setupAutocompletePostLoad();
    } else if (f.type === 'chips') {
      this.setupChipsPostLoad();
    } else if (f.type === 'select') {
      const control = this.form.get(this.field.name);
      const currentValue = control?.value;

      if (control && combined.length > 0) {
        if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
          const valueToRestore = currentValue;
          setTimeout(() => {
            control.setValue(null, { emitEvent: false });
            control.setValue(valueToRestore, { emitEvent: false });
            this.cdr.markForCheck();
          }, 0);
        } else {
          control.setValue(combined[0].value);
        }
      }
    }

    this.isFirstTrigger = false;
    this.cdr.markForCheck();
  }

  private setupAutocompletePostLoad() {
    if (this.isFilterSetup || this.field.type !== 'autocomplete') return;

    const control = this.form.get(this.field.name);
    if (!control) return;

    this.isFilterSetup = true;

    const currentValue = control.value;
    if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
      setTimeout(() => {
        control.setValue(currentValue, { emitEvent: false });
        const initialLabel = this.displayOption(currentValue);
        this.filterOptions(initialLabel);
      }, 0);
    }

    control.valueChanges.pipe(
      map(value => {
        return typeof value === 'string' ? value : this.displayOption(value);
      }),
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.filterOptions(searchTerm);
      this.cdr.markForCheck();
    });
  }

  private filterOptions(searchTerm: string): void {
    const filterValue = searchTerm.toLowerCase();
    if (!filterValue) {
      this.filteredOptions.set(this.allOptions());
      return;
    }

    const newFilteredOptions = this.allOptions().filter(option =>
      option.label.toLowerCase().includes(filterValue)
    );

    this.filteredOptions.set(newFilteredOptions);
  }

  /** Returns the display label for a given option value. */
  displayOption = (value: any): string => {
    if (value === null || value === undefined || typeof value === 'object') return '';
    const valueString = String(value);
    const option = this.allOptions().find(opt => String(opt.value) === valueString);
    if (option) {
      return option.label;
    }
    return valueString;
  };

  // ── Chips: selección múltiple con tokens ';'-separados (p.ej. EnviarA) ──

  /** Texto del input de búsqueda. */
  chipsQuery = signal<string>('');
  /** Chips derivados del FormControl: tokens → { token, label }. */
  readonly chipsItems = computed(() => {
    const control = this.form.get(this.field.name);
    const value = control?.value as string | null;
    if (!value) return [];
    const options = this.allOptions();
    return value
      .split(';')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => {
        const opt = options.find(o => String(o.value).toLowerCase() === t.toLowerCase());
        return { token: t, label: opt?.label ?? t };
      });
  });

  private isChipsSetup = false;

  private setupChipsPostLoad(): void {
    if (this.isChipsSetup || this.field.type !== 'chips') return;
    const control = this.form.get(this.field.name);
    if (!control) return;
    this.isChipsSetup = true;
    control.valueChanges.pipe(distinctUntilChanged()).subscribe(() => this.cdr.markForCheck());
  }

  /** Filtra las opciones cargadas por el texto del input (client-side). */
  onChipsQuery(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.chipsQuery.set(q);
    this.filterOptions(q);
    this.cdr.markForCheck();
  }

  /** Agrega el token de la opción seleccionada (api → prefijo apiPrefix; estática → tal cual). */
  onChipsOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const opt = event.option.value as Option;
    const value = String(opt.value);
    const prefix = (this.field as any).apiPrefix ?? 'U';
    const token = value.includes(':') ? value : `${prefix}:${value}`;
    this.addChip(token);
  }

  /** Agrega un token al control si no existe (case-insensitive). */
  addChip(token: string): void {
    const control = this.form.get(this.field.name);
    if (!control) return;
    const actual = (control.value as string) ?? '';
    const tokens = actual.split(';').map(t => t.trim()).filter(Boolean);
    if (!tokens.some(t => t.toLowerCase() === token.toLowerCase())) {
      tokens.push(token);
    }
    control.setValue(tokens.join(';'));
    control.markAsTouched();
    this.chipsQuery.set('');
    this.filterOptions('');
    this.cdr.markForCheck();
  }

  /** Quita un token del control (case-insensitive). */
  removeChip(token: string): void {
    const control = this.form.get(this.field.name);
    if (!control) return;
    const tokens = ((control.value as string) ?? '')
      .split(';').map(t => t.trim())
      .filter(t => t && t.toLowerCase() !== token.toLowerCase());
    control.setValue(tokens.join(';'));
    control.markAsTouched();
    this.cdr.markForCheck();
  }

  /** Distingue opciones de rol (token R:) para el ícono del autocomplete. */
  isRolOption(opt: Option): boolean {
    return String(opt.value).startsWith('R:');
  }

  /** Returns the static options array from the field configuration (select, autocomplete, radio, checkbox-multiple). */
  getStaticOptions(): Option[] {
    // Support options for select, autocomplete, radio, and checkbox-multiple
    return (this.field as any).options || [];
  }

  /** Handles file selection from an input element and emits the fileChange event. */
  handleFile(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.fileName.set(file.name);
      this.fileChange.emit({ name: this.field.name, file });
      this.form.get(this.field.name)?.markAsTouched();
      this.cdr.markForCheck();
    }
  }

  /** Whether the field control has validation errors and has been touched/dirty. */
  hasError(): boolean {
    const control = this.form.get(this.field.name);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  /** Whether the current field has a quickAdd config. */
  hasQuickAdd(): boolean {
    return !!(this.field as SelectField).quickAdd;
  }

  /** Handles file-array file changes from the FileArrayComponent child. */
  onFileArrayChange(files: File[]) {
    this.fileArrayChange.emit(files);
    this.cdr.markForCheck();
  }

  /** Opens the QuickAddDialog and appends the new option on success. */
  openQuickAdd() {
    const selectField = this.field as SelectField;
    const qaConfig = selectField.quickAdd;
    if (!qaConfig) return;

    // Determine the POST URL: explicit quickAdd.url > select field's api.endpoint
    const postUrl = qaConfig.url ?? (selectField as any).api?.endpoint;

    // Use wider dialog if full form config is registered
    const hasFullForm = this.formConfigRegistry.get(qaConfig.resource);
    const dialogRef = this.dialog.open(QuickAddDialogComponent, {
      width: hasFullForm ? '900px' : '400px',
      data: { 
        resource: qaConfig.resource, 
        label: qaConfig.label,
        url: postUrl,
        fields: qaConfig.fields
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.allOptions.update(prev => [...prev, result]);
        this.filteredOptions.update(prev => [...prev, result]);
        this.form.get(this.field.name)?.setValue(result.value);
        this.cdr.markForCheck();
      }
    });
  }

  /** Returns a user-friendly validation error message for the current field control. */
  getErrorMessage(): string {
    const control = this.form.get(this.field.name);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return this.t().field.required;
    if (errors['email']) return this.t().field.invalidEmail;
    if (errors['minlength']) return this.t().field.minLength.replace('{length}', errors['minlength'].requiredLength);
    if (errors['pattern']) return this.t().field.invalidFormat;
    if (errors['min']) return this.t().field.minValue.replace('{min}', String((this.field as BaseField).validations?.min));
    if (errors['max']) return this.t().field.maxValue.replace('{max}', String((this.field as BaseField).validations?.max));

    return this.t().field.invalidData;
  }

  /** Toggles a value in a checkbox-multiple field's array of selected values. */
  onToggleCheckboxMultiple(fieldName: string, value: any, checked: boolean) {
    const control = this.form.get(fieldName);
    if (!control) return;

    const current = control.value || [];
    let updated: any[] = [];

    if (checked) {
      updated = [...current, value];
    } else {
      updated = current.filter((v: any) => v !== value);
    }

    control.setValue(updated);
    control.markAsTouched();
    this.cdr.markForCheck();
  }

  /** Marks a radio button control as touched and dirty for validation display. */
  markRadioAsTouched(fieldName: string) {
    const control = this.form.get(fieldName);
    if (!control) return;

    control.markAsTouched();
    control.markAsDirty();
    this.cdr.markForCheck();
  }

  /** Marks the switch control as touched/dirty when toggled. */
  onSwitchChange(event: MatSlideToggleChange) {
    const control = this.form.get(this.field.name);
    if (control) {
      control.markAsTouched();
      control.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  /** Toggles password visibility between plain text and masked. */
  togglePasswordVisibility(event: MouseEvent) {
    event.stopPropagation();
    this.hidePassword.update(value => !value);
  }

  /** Whether the given field type should render as a standard HTML input (text, email, password, etc.). */
  isSimpleInput(type: string): boolean {
    return ['text', 'email', 'password', 'tel', 'url', 'number', 'color', 'week', 'month', 'textarea'].includes(type);
  }
}
