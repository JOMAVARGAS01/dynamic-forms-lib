import { Component, ChangeDetectionStrategy, computed, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GridApi, ColDef } from 'ag-grid-community';

export interface AgGridColumnVisibilityItem {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * Menú de columnas visibles para grillas AG Grid community (sin Enterprise).
 *
 * Renderiza un botón (icono view_column) que abre un mat-menu con un checkbox
 * por columna. Al alternar un checkbox se oculta/muestra la columna en vivo
 * vía `gridApi.setColumnsVisible()`. Reutilizable: recibe la GridApi y las
 * ColDefs de cualquier grilla (CrudManager o páginas custom).
 *
 * Nota: los inputs son `@Input()` clásicos (no signals) porque ng-packagr
 * emitía `InputSignal<GridApi>` perdiendo el `| null` con `input<T | null>()`.
 */
@Component({
  selector: 'app-ag-grid-columns-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatCheckboxModule, MatTooltipModule],
  templateUrl: './ag-grid-columns-menu.component.html',
  styleUrls: ['./ag-grid-columns-menu.component.css'],
})
export class AgGridColumnsMenuComponent {
  /** Grid API de la grilla a controlar. Null hasta que la grilla está lista (botón deshabilitado). */
  @Input() gridApi: GridApi | null = null;
  /** Definiciones de columnas a listar en el menú. */
  @Input() columns: ColDef[] = [];
  /** ColIds que no deben aparecer en el menú (p.ej. columna de acciones). */
  @Input() excludeColumnIds: string[] = [];
  /** Tooltip / aria-label del botón (i18n). */
  @Input() tooltip: string = '';
  /** Título del panel del menú (i18n). Vacío oculta el texto del header. */
  @Input() title: string = '';

  /** Versión del menú: se incrementa al abrir para re-leer el estado visible. */
  private menuVersion = signal(0);

  /** Columnas del menú con su estado visible actual (se recalcula al abrir el menú). */
  visibleColumns = computed<AgGridColumnVisibilityItem[]>(() => {
    this.menuVersion(); // dependencia de refresco al abrir el mat-menu (render lazy)
    const api = this.gridApi;
    const excluded = new Set(this.excludeColumnIds);
    return this.columns
      .filter((col) => !excluded.has(this.colIdOf(col)))
      .map((col) => {
        const id = this.colIdOf(col);
        const column = api?.getColumn(id);
        return {
          id,
          label: col.headerName ?? col.field ?? id,
          visible: column?.isVisible() ?? true,
        };
      });
  });

  private visibleCount = computed(() => this.visibleColumns().filter((c) => c.visible).length);

  /** Contador "N/M" de columnas visibles vs totales, para el header del panel. */
  visibleCountText = computed(() => {
    const all = this.visibleColumns();
    const visible = all.filter((c) => c.visible).length;
    return `${visible}/${all.length}`;
  });

  onMenuOpened(): void {
    this.menuVersion.update((v) => v + 1);
  }

  /** Guard: deshabilita el checkbox de la única columna visible restante. */
  isLastVisible(item: AgGridColumnVisibilityItem): boolean {
    return item.visible && this.visibleCount() <= 1;
  }

  toggle(colId: string, checked: boolean): void {
    const api = this.gridApi;
    if (!api) return;
    if (!checked && this.visibleCount() <= 1) return;
    api.setColumnsVisible([colId], checked);
  }

  private colIdOf(col: ColDef): string {
    return col.colId ?? col.field ?? col.headerName ?? '';
  }
}
