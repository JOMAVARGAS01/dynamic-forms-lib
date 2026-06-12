import { Component, OnInit, signal, inject, Input, OnChanges, SimpleChanges, computed, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridOptions,
  ColDef,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  CsvExportModule
} from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { FormsComponent } from '../forms/forms.component';
import { FormConfig, FormFieldAppearance, FORM_FIELD_APPEARANCE_TOKEN } from '../../types/dynamic-form.types';
import { ActionCellRendererComponent } from '../action-cell/action-cell.component';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import * as ExcelJS from 'exceljs';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeService } from '../../services/theme.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

ModuleRegistry.registerModules([AllCommunityModule, CsvExportModule]);

@Component({
  selector: 'app-crud-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AgGridAngular,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    FormsComponent,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule
  ],
  styleUrls: ['./crud-manager.component.css'],
  templateUrl: './crud-manager.component.html',
})
/**
 * Generic CRUD manager wrapping AG-Grid with a dynamic form sidebar.
 * Handles list display, Excel export, create/edit via sidebar, delete with confirmation, and quick-filter search.
 */
export class CrudManagerComponent implements OnInit, OnChanges {
  /** Dynamic form configuration used in the create/edit sidebar. */
  @Input({ required: true }) formConfig!: FormConfig;
  /** AG-Grid column definitions for the data table. */
  @Input({ required: true }) columnDefs: ColDef[] = [];
  /** Title displayed in the header and Excel export filename. */
  @Input() title: string = 'Mantenimiento';
  /** API endpoint URL for fetching the list data. */
  @Input({ required: true }) apiUrl!: string;
  /** Optional custom URL for creating records. Falls back to apiUrl. */
  @Input() createUrl?: string;
  /** Optional custom URL or function returning the URL for updating records. Falls back to apiUrl/{id}. */
  @Input() updateUrl?: string | ((data: any) => string);
  /** Optional function returning the delete URL for a given record. Falls back to apiUrl/{id}. */
  @Input() deleteUrl?: (data: any) => string;
  /** Transforms the raw API response into the row data array. */
  @Input() responseMapper: (response: any) => any[] = (res) => res;
  /** Whether to show the Edit/Delete action column. */
  @Input() showActions: boolean = true;

  /** Reactive signal holding the current row data displayed in the grid. */
  rowData = signal<any[]>([]);
  /** Whether the form sidebar is currently open. */
  isFormOpen = signal<boolean>(false);
  /** Current form mode: 'add' for new records, 'edit' for existing ones. */
  formMode = signal<'add' | 'edit'>('add');
  /** Initial data payload when editing a record. null for new records. */
  initialData = signal<any | null>(null);

  private gridApi!: GridApi;
  private http = inject(HttpClient);
  private sidebarService = inject(SidebarService);
  protected themeService = inject(ThemeService);
  protected defaultAppearance = inject(FORM_FIELD_APPEARANCE_TOKEN);
  private cdr = inject(ChangeDetectorRef);

  /** Active AG-Grid CSS theme class, toggled between light and dark variants. */
  agGridTheme = signal('ag-theme-material');

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {
    const baseTheme = this.themeService.agGridTheme();
    const isDark = this.themeService.isDarkMode();
    this.agGridTheme.set(isDark ? `ag-theme-${baseTheme}-dark` : `ag-theme-${baseTheme}`);

    effect(() => {
      const baseTheme = this.themeService.agGridTheme();
      const isDark = this.themeService.isDarkMode();
      this.agGridTheme.set(isDark ? `ag-theme-${baseTheme}-dark` : `ag-theme-${baseTheme}`);
      this.cdr.markForCheck();
    });
  }

  gridOptions: GridOptions = {
    domLayout: 'autoHeight',
    pagination: true,
    paginationPageSize: 20,
    context: {
      componentParent: this,
    },
  };

  defaultColDef: ColDef = {
    floatingFilter: false,
  };

  gridColumnDefs: ColDef[] = [];

  ngOnInit(): void {
    this.setupColumns();
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['apiUrl'] && !changes['apiUrl'].firstChange) {
      this.loadData();
    }
    if (changes['columnDefs'] || changes['showActions']) {
      this.setupColumns();
    }
  }

  private setupColumns() {
    this.gridColumnDefs = [...this.columnDefs];

    if (this.showActions) {
      this.gridColumnDefs.push({
        headerName: 'Acciones',
        width: 120,
        cellRenderer: ActionCellRendererComponent,
        filter: false,
        sortable: false,
        resizable: false,
        pinned: 'left',
      });
    }
  }

  private loadData() {
    if (!this.apiUrl) return;

    this.http.get<any>(this.apiUrl)
      .subscribe({
        next: (data) => {
          const mappedData = this.responseMapper(data);
          this.rowData.set(mappedData);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error cargando datos', err);
          this.rowData.set([]);
          this.cdr.markForCheck();
        }
      });
  }

  /** Applies a quick-filter to the AG-Grid based on user input. */
  onQuickFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.gridApi.setGridOption('quickFilterText', value);
  }

  /** Clears the quick-filter search input and resets the grid filter. */
  clearSearch(inputElement: HTMLInputElement) {
    inputElement.value = '';
    this.gridApi.setGridOption('quickFilterText', '');
  }

  /** Stores the grid API reference and auto-sizes columns to fit. */
  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  /** Exports the visible grid data (excluding actions column) to an Excel file. */
  onExport() {
    const visibleColumns = this.gridApi.getAllDisplayedColumns()
      .filter(col => col.getColDef().headerName !== 'Acciones');

    const headers = visibleColumns.map(col => col.getColDef().headerName || col.getColDef().field);
    const fields = visibleColumns.map(col => col.getColDef().field || null);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Datos');

    // Title (merged across columns)
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    ws.mergeCells(1, 1, 1, Math.max(1, headers.length));
    const titleCell = ws.getCell(1, 1);
    titleCell.value = this.title;
    titleCell.font = { size: 20, bold: true };

    const dateCell = ws.getCell(2, 1);
    dateCell.value = `Fecha: ${formattedDate}`;
    dateCell.font = { bold: true };

    // Headers start at row 4
    const headerRowIndex = 4;
    ws.getRow(headerRowIndex).values = headers;

    // Style header row
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Columns width (do NOT set `header` property — that can overwrite existing rows)
    ws.columns = headers.map(h => ({ width: Math.min((String(h || '').length || 10) + 5, 50) }));

    // Data rows
    this.gridApi.forEachNodeAfterFilter((node) => {
      if (node.data) {
        const row = fields.map(field => (field ? node.data[field] ?? '' : ''));
        ws.addRow(row);
      }
    });

    const filenameDate = formattedDate.replace(/-/g, '');
    const filename = `${this.title} ${filenameDate}.xlsx`;

    wb.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  /** Opens the sidebar in 'add' mode for creating a new record. */
  onAdd() {
    this.sidebarService.closeSidebar();
    this.formMode.set('add');
    this.initialData.set(null);
    this.isFormOpen.set(true);
  }

  /** Opens the sidebar in 'edit' mode pre-filled with the given record data. */
  onEdit(data: any) {
    this.sidebarService.closeSidebar();
    this.formMode.set('edit');
    this.initialData.set(data);
    this.isFormOpen.set(true);
  }

  /** Deletes a record after confirmation. Uses deleteUrl function or falls back to apiUrl/{id}. */
  onDelete(data: any) {
    if (!data) {
      this.snackBar.open('⚠️ Error: No se encontraron datos para eliminar.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Determine the delete URL
    let url = '';
    if (this.deleteUrl) {
      url = this.deleteUrl(data);
    } else if (data.id) {
      url = `${this.apiUrl}/${data.id}`;
    } else {
      this.snackBar.open('⚠️ Error: No se puede determinar la URL de eliminación (falta ID o configuración custom).', 'Cerrar', { duration: 3000 });
      return;
    }

    this.openCustomConfirmation('¿Está seguro de que desea eliminar este registro?', () => {
      this.http.delete(url).subscribe({
        next: () => {
          this.snackBar.open('✅ Registro eliminado con éxito.', 'Cerrar', { duration: 3000 });
          this.loadData(); // Refetch data
        },
        error: (err) => {
          console.error('Error deleting record', err);
          this.snackBar.open('❌ Error al eliminar el registro.', 'Cerrar', { duration: 3000 });
        }
      });
    });
  }

  /** Handles form submission from the sidebar. Sends POST (add) or PUT (edit) to the API. */
  handleSubmit(formData: FormData) {
    // Detect if FormData contains files
    let hasFiles = false;
    formData.forEach((value) => {
      if (value instanceof File) hasFiles = true;
    });

    // Build plain object for JSON submissions (no files)
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (!(value instanceof File)) {
        data[key] = value;
      }
    });

    if (this.formMode() === 'add') {
      // Manual ID Generation for numeric consistency
      const currentRows = this.rowData();
      let maxId = 0;
      currentRows.forEach(row => {
        const idNum = Number(row.id);
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      });
      data['id'] = (maxId + 1).toString();

      const url = this.createUrl || this.apiUrl;
      // If files exist, send FormData (multipart); otherwise send JSON
      const body = hasFiles ? formData : data;

      this.http.post(url, body).subscribe({
        next: () => {
          this.snackBar.open('✅ Registro agregado con éxito.', 'Cerrar', { duration: 3000 });
          this.loadData();
          this.isFormOpen.set(false);
          this.sidebarService.setSidebarOpen(true);
        },
        error: (err) => {
          console.error('Error adding record', err);
          this.snackBar.open('❌ Error al agregar registro.', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      const currentData = this.initialData();
      let url = '';

      if (this.updateUrl) {
        if (typeof this.updateUrl === 'function') {
          url = this.updateUrl(currentData);
        } else {
          url = this.updateUrl;
        }
      } else if (currentData && currentData.id) {
        url = `${this.apiUrl}/${currentData.id}`;
      } else {
        this.snackBar.open('⚠️ Error: No se puede determinar la URL de actualización.', 'Cerrar', { duration: 3000 });
        return;
      }

      // If files exist, send FormData (multipart); otherwise send JSON
      const body = hasFiles ? formData : data;

      this.http.put(url, body).subscribe({
        next: () => {
          this.snackBar.open('✅ Registro actualizado con éxito.', 'Cerrar', { duration: 3000 });
          this.loadData();
          this.isFormOpen.set(false);
          this.sidebarService.setSidebarOpen(true);
        },
        error: (err) => {
          console.error('Error updating record', err);
          this.snackBar.open('❌ Error al actualizar registro.', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  /** Closes the form sidebar and reopens the list sidebar. */
  handleCancel() {
    this.isFormOpen.set(false);
    this.sidebarService.setSidebarOpen(true);
  }

  private openCustomConfirmation(message: string, onConfirm: () => void) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { message: message },
      minWidth: '300px',
      maxWidth: '500px'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        onConfirm();
      }
      this.cdr.markForCheck();
    });
  }
}
