import { Component, Input, inject, OnInit, OnDestroy, signal, ChangeDetectionStrategy, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormArrayField, FormFieldAppearance, FORM_FIELD_APPEARANCE } from '../../types/dynamic-form.types';
import { FieldComponent } from '../field/field.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';
import { applyVisibility, buildItemFormGroup } from '../visibility';

@Component({
  selector: 'app-form-array',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    FieldComponent
  ],
  styleUrls: ['./form-array.component.css'],
  templateUrl: './form-array.component.html'
})
/**
 * Repeating collapsible sub-form. Renders one `mat-expansion-panel` per
 * FormArray item with add/remove controls. Add pre-fills the new item
 * with `field.defaultItem`. Remove asks for confirmation via
 * `ConfirmationDialogComponent`. Per-item `visibleIf` resolves against
 * the item's own FormGroup (no `../` parent reference in v1). Item-level
 * `type: 'file'` is silently skipped at build time.
 */
export class FormArrayComponent implements OnInit, OnDestroy {
  /** The `form-array` field config (must include `type: 'form-array'`). */
  @Input({ required: true }) field!: FormArrayField;
  /** The reactive FormArray control (built by `FormsComponent.buildForm`). */
  @Input({ required: true }) formArray!: FormArray;
  /** Material appearance style for the inner fields. */
  @Input() appearance: FormFieldAppearance = FORM_FIELD_APPEARANCE;

  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private subscription: Subscription | null = null;

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  /** Per-item visibility maps (item index -> fieldName -> visible?). */
  private itemVisibilityMaps = signal<Record<number, Record<string, boolean>>>({});

  /** Returns true when a given inner field in a given item should be rendered. */
  isFieldVisible(itemIndex: number, fieldName: string): boolean {
    return this.itemVisibilityMaps()[itemIndex]?.[fieldName] ?? true;
  }

  ngOnInit() {
    this.refreshAllItems();
    this.subscription = this.formArray.valueChanges.subscribe(() => this.refreshAllItems());
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  /** Re-computes per-item visibility for every item in the FormArray. */
  private refreshAllItems(): void {
    const map: Record<number, Record<string, boolean>> = {};
    this.formArray.controls.forEach((ctrl, idx) => {
      const group = ctrl as FormGroup;
      const inner: Record<string, boolean> = {};
      applyVisibility(group, this.field.fields, inner);
      map[idx] = inner;
    });
    this.itemVisibilityMaps.set(map);
    this.cdr.markForCheck();
  }

  /**
   * Interpolates the per-item title template. Supports:
   * - `{{index}}` -> 1-based item position
   * - `{{fieldName}}` -> current value of the inner field (raw, may be null)
   * Unknown tokens pass through verbatim for debuggability.
   */
  itemTitle(itemIndex: number, itemGroup: FormGroup): string {
    const template = this.field.itemTitle ?? this.t().formArray.itemTitle;
    const values = itemGroup.getRawValue();
    return template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
      if (token === 'index') return String(itemIndex + 1);
      const v = values[token];
      return v === null || v === undefined ? '' : String(v);
    });
  }

  /** Tracks the FormGroup identity for `@for` so the panel survives item rebuilds. */
  trackItem = (_index: number, item: FormGroup): FormGroup => item;

  /**
   * Adds a new item pre-filled with `field.defaultItem` (or empty).
   * The new FormGroup is pushed to the FormArray; the
   * FormArray's `valueChanges` subscription then re-computes visibility.
   */
  addItem(): void {
    const group = buildItemFormGroup(this.fb, this.field.fields, this.field.defaultItem);
    this.formArray.push(group);
  }

  /**
   * Removes an item by index, after asking for confirmation when
   * `field.confirmRemoveMessage` is set (or the global default applies).
   */
  removeItem(itemIndex: number): void {
    const message = this.field.confirmRemoveMessage ?? this.t().formArray.confirmRemoveItem;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { message },
      minWidth: '300px',
      maxWidth: '500px'
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.formArray.removeAt(itemIndex);
        this.refreshAllItems();
      }
      this.cdr.markForCheck();
    });
  }

  /** Returns the FormGroup at the given index (template helper). */
  itemGroupAt(index: number): FormGroup {
    return this.formArray.at(index) as FormGroup;
  }

  /** True when the array is below the configured `minItems` (if any). */
  get minItemsError(): boolean {
    const min = this.field.minItems ?? 0;
    return min > 0 && this.formArray.length < min;
  }

  /** Translated `minItems` error message (interpolates `{min}`). */
  get minItemsErrorText(): string {
    const min = this.field.minItems ?? 0;
    return this.t().formArray.minItemsError.replace('{min}', String(min));
  }
}
