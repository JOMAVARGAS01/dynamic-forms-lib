import { Component, signal, ChangeDetectionStrategy, ChangeDetectorRef, inject, Optional, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-action-cell-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './action-cell.component.html',
  styleUrls: ['./action-cell.component.css']
})
/**
 * AG-Grid custom cell renderer that provides Edit and Delete action buttons.
 * Implements ICellRendererAngularComp for integration with AG-Grid.
 */
export class ActionCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams;
  private cdr = inject(ChangeDetectorRef);

  /** Whether to show the Edit button. Resolved from grid context permissions. */
  showEdit = true;
  /** Whether to show the Delete button. Resolved from grid context permissions. */
  showDelete = true;

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  /** Initializes the cell renderer with AG-Grid parameters. */
  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.resolvePermissions(params);
  }

  /** Refreshes the cell renderer when the cell data changes. Returns true to signal success. */
  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.resolvePermissions(params);
    this.cdr.markForCheck();
    return true;
  }

  private resolvePermissions(params: ICellRendererParams): void {
    const perms = params.context?.permissions ?? {};
    this.showEdit = perms.readonly ? false : (perms.canUpdate ?? true);
    this.showDelete = perms.readonly ? false : (perms.canDelete ?? true);
  }

  /** Triggers the parent component's onEdit method with this row's data. */
  onEditClicked() {
    this.params.context.componentParent.onEdit(this.params.data);
  }

  /** Triggers the parent component's onDelete method with this row's data. */
  onDeleteClicked() {
    this.params.context.componentParent.onDelete(this.params.data);
  }
}
