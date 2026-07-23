import { Component, OnInit, signal, inject, Input, OnChanges, SimpleChanges, computed, effect, ChangeDetectionStrategy, ChangeDetectorRef, Optional, Signal, input } from '@angular/core';
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
import { FormConfig, FormFieldAppearance, FORM_FIELD_APPEARANCE_TOKEN, CrudPermissions } from '../../types/dynamic-form.types';
import { ActionCellRendererComponent } from '../action-cell/action-cell.component';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import * as ExcelJS from 'exceljs';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeService } from '../../services/theme.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';

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
  columnDefs = input.required<ColDef[]>();
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
  showActions = input<boolean>(true);
  /** Optional permissions configuration. All fields default to true (fail-open). */
  permissions = input<CrudPermissions | null>(null);

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

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  /** Active AG-Grid CSS theme class, toggled between light and dark variants. */
  agGridTheme = signal('ag-theme-material');

  /** Resolved permissions with fail-open defaults. */
  resolvedPermissions = computed<Required<CrudPermissions>>(() => {
    const p = this.permissions();
    return {
      canCreate: p?.canCreate ?? true,
      canRead: p?.canRead ?? true,
      canUpdate: p?.canUpdate ?? true,
      canDelete: p?.canDelete ?? true,
      canExport: p?.canExport ?? true,
      readonly: p?.readonly ?? false,
    };
  });

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

    effect(() => {
      const perms = this.resolvedPermissions();
      if (this.gridApi) {
        this.gridOptions.context.permissions = perms;
        this.gridApi.refreshCells({ force: true });
      }
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

  /**
   * Computed AG-Grid column definitions. Re-derives the array whenever
   * the input columns, the showActions flag, or the translations change.
   * The template binding `[columnDefs]="gridColumnDefs()"` automatically
   * reflects the new array.
   */
  gridColumnDefs = computed<ColDef[]>(() => {
    const cols = [...this.columnDefs()];
    if (this.showActions() && !this.resolvedPermissions().readonly) {
      cols.push({
        headerName: this.t().crud.actions,
        // Ancho fijo 120px + minWidth 120px evita que AG Grid apriete la
        // columna pinned cuando hay muchas columnas o el viewport es chico.
        // resizable: true permite al usuario ajustarla manualmente si el
        // contenido de los botones requiere más espacio.
        width: 120,
        minWidth: 120,
        cellRenderer: ActionCellRendererComponent,
        filter: false,
        sortable: false,
        resizable: true,
        pinned: 'left',
      });
    }
    return cols;
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['apiUrl'] && !changes['apiUrl'].firstChange) {
      this.loadData();
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
  async onExport(): Promise<void> {
    const { blob, filename } = await this.buildExcelExport();
    this.downloadFile(blob, filename);
  }

  /**
   * Builds the Excel workbook from the current grid data and returns
   * a blob + filename ready for download. Pulls visible columns from
   * the grid, writes a title row, a date row, the header row, and
   * one row per filtered node.
   */
  private async buildExcelExport(): Promise<{ blob: Blob; filename: string }> {
    const actionsHeader = this.t().crud.actions;
    const visibleColumns = this.gridApi.getAllDisplayedColumns()
      .filter(col => col.getColDef().headerName !== actionsHeader);

    const headers = visibleColumns.map(col => col.getColDef().headerName || col.getColDef().field);
    const fields = visibleColumns.map(col => col.getColDef().field || null);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Datos');

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    // Title row (merged across all columns)
    ws.mergeCells(1, 1, 1, Math.max(1, headers.length));
    const titleCell = ws.getCell(1, 1);
    titleCell.value = this.title;
    titleCell.font = { size: 20, bold: true };

    // Date row
    const dateCell = ws.getCell(2, 1);
    dateCell.value = `Fecha: ${formattedDate}`;
    dateCell.font = { bold: true };

    // Header row at index 4 (rows 1-3 are reserved for title + date)
    const headerRowIndex = 4;
    ws.getRow(headerRowIndex).values = headers;
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Column widths
    ws.columns = headers.map(h => ({ width: Math.min((String(h || '').length || 10) + 5, 50) }));

    // Data rows (respects current filter)
    this.gridApi.forEachNodeAfterFilter((node) => {
      if (node.data) {
        const row = fields.map(field => (field ? node.data[field] ?? '' : ''));
        ws.addRow(row);
      }
    });

    const filenameDate = formattedDate.replace(/-/g, '');
    const filename = `${this.title} ${filenameDate}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return { blob, filename };
  }

  /**
   * Triggers a browser download for the given blob with the specified filename.
   * Cleans up the temporary object URL after the click event fires.
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Opens the sidebar in 'add' mode for creating a new record. */
  onAdd() {
    if (this.resolvedPermissions().readonly) return;
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
      this.showSnack('missingDataError');
      return;
    }

    // Determine the delete URL
    let url = '';
    if (this.deleteUrl) {
      url = this.deleteUrl(data);
    } else if (data.id) {
      url = `${this.apiUrl}/${data.id}`;
    } else {
      this.showSnack('missingUrlError');
      return;
    }

    this.openCustomConfirmation(this.t().crud.confirmDelete, () => {
      this.http.delete(url).subscribe({
        next: () => {
          this.showSnack('deleteSuccess');
          this.loadData(); // Refetch data
        },
        error: (err) => {
          console.error('Error deleting record', err);
          this.showSnack('deleteError');
        }
      });
    });
  }

  /** Handles form submission from the sidebar. Sends POST (add) or PUT (edit) to the API. */
  handleSubmit(formData: FormData) {
    const mode = this.formMode();
    const body = this.buildRequestBody(formData, mode);

    if (mode === 'add') {
      this.executeRequest('post', this.createUrl || this.apiUrl, body, 'addSuccess', 'addError');
      return;
    }

    // mode === 'edit': resolve the update URL from input or fall back to apiUrl/{id}
    const currentData = this.initialData();
    const url = this.updateUrl
      ? (typeof this.updateUrl === 'function' ? this.updateUrl(currentData) : this.updateUrl)
      : (currentData?.id ? `${this.apiUrl}/${currentData.id}` : null);

    if (!url) {
      this.showSnack('missingUpdateUrlError');
      return;
    }

    this.executeRequest('put', url, body, 'updateSuccess', 'updateError');
  }

  /**
   * Prepares the request body from FormData. Returns the FormData as-is
   * when it contains files (multipart upload); otherwise returns a plain
   * object for JSON submission. In 'add' mode, also generates the next
   * sequential numeric ID and appends it to the JSON body.
   */
  private buildRequestBody(formData: FormData, mode: 'add' | 'edit'): FormData | Record<string, any> {
    let hasFiles = false;
    formData.forEach((value) => {
      if (value instanceof File) hasFiles = true;
    });

    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (!(value instanceof File)) {
        data[key] = value;
      }
    });

    if (mode === 'add') {
      // Manual ID generation for numeric consistency
      const currentRows = this.rowData();
      let maxId = 0;
      currentRows.forEach(row => {
        const idNum = Number(row.id);
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      });
      data['id'] = (maxId + 1).toString();
    }

    return hasFiles ? formData : data;
  }

  /**
   * Executes a POST or PUT request, showing the appropriate snackbar on
   * success or failure, and refreshing the grid + closing the sidebar
   * on success. Centralizes HTTP feedback so add/update paths behave
   * consistently.
   */
  private executeRequest(
    method: 'post' | 'put',
    url: string,
    body: FormData | Record<string, any>,
    successKey: keyof DynamicFormsTranslations['crud'],
    errorKey: keyof DynamicFormsTranslations['crud']
  ): void {
    const request$ = method === 'post' ? this.http.post(url, body) : this.http.put(url, body);

    request$.subscribe({
      next: () => {
        this.showSnack(successKey);
        this.loadData();
        this.isFormOpen.set(false);
        this.sidebarService.setSidebarOpen(true);
      },
      error: (err) => {
        console.error(`${method.toUpperCase()} request failed`, err);
        this.showSnack(errorKey);
      }
    });
  }

  /** Closes the form sidebar and reopens the list sidebar. */
  handleCancel() {
    this.isFormOpen.set(false);
    this.sidebarService.setSidebarOpen(true);
  }

  /**
   * Opens a translated snackbar notification with the standard close action.
   * Centralizes snackbar config (duration, action label) so all CRUD
   * feedback stays consistent. Pass a key from the `crud` translation
   * namespace (e.g. 'addSuccess', 'deleteError').
   */
  private showSnack(messageKey: keyof DynamicFormsTranslations['crud']): void {
    this.snackBar.open(this.t().crud[messageKey], this.t().snackbar.close, { duration: 3000 });
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
