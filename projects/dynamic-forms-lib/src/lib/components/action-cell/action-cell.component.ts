import { Component, signal, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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

  /** Initializes the cell renderer with AG-Grid parameters. */
  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  /** Refreshes the cell renderer when the cell data changes. Returns true to signal success. */
  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.cdr.markForCheck();
    return true;
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
