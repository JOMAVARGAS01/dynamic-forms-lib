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
export class ActionCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams;
  private cdr = inject(ChangeDetectorRef);

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.cdr.markForCheck();
    return true;
  }

  onEditClicked() {
    this.params.context.componentParent.onEdit(this.params.data);
  }

  onDeleteClicked() {
    this.params.context.componentParent.onDelete(this.params.data);
  }
}
