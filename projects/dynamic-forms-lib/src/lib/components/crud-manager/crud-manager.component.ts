import { Component, OnInit, signal, inject, Input, Output, EventEmitter, OnChanges, SimpleChanges, computed, effect, ChangeDetectionStrategy, ChangeDetectorRef, Optional, Signal, input } from '@angular/core';
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
import { AgGridColumnsMenuComponent } from '../ag-grid-columns-menu/ag-grid-columns-menu.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatChipsModule,
    MatProgressBarModule,
    AgGridColumnsMenuComponent,
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
  /** Optional custom URL or function returning the URL for fetching detail on edit. Falls back to using grid row data. */
  @Input() editUrl?: string | ((data: any) => string);
  /** Optional function returning the delete URL for a given record. Falls back to apiUrl/{id}. */
  @Input() deleteUrl?: (data: any) => string;
  /**
   * Optional async hook ejecutado antes del PUT (modo edición), tras construir
   * el body y resolver la URL. Recibe el body mutable y el registro actual
   * (initialData). Devuelve false para CANCELAR el guardado (sin request);
   * true para continuar. Útil para confirmaciones con datos extra (p.ej. un
   * motivo obligatorio) que se agregan al body antes del request.
   */
  @Input() beforeUpdate?: (body: Record<string, any>, currentData: any) => Promise<boolean> | boolean;
  /** Transforms the raw API response into the row data array. */
  @Input() responseMapper: (response: any) => any[] = (res) => res;
  /** Whether to show the Edit/Delete action column. */
  showActions = input<boolean>(true);
  /** Optional permissions configuration. All fields default to true (fail-open). */
  permissions = input<CrudPermissions | null>(null);

  /** Reactive signal holding the current row data displayed in the grid. */
  rowData = signal<any[]>([]);

  /**
   * Emite al abrir el formulario (modo add o edit) con la fila correspondiente
   * (null en modo add). Permite al host ajustar el formConfig según el registro
   * que se está editando (p.ej. marcar readonly un campo por el estado actual).
   */
  @Output() formOpened = new EventEmitter<{ mode: 'add' | 'edit'; data: any }>();
  /** Whether the form sidebar is currently open. */
  isFormOpen = signal<boolean>(false);
  /** Whether data is currently loading. Toggles the indeterminate progress bar. */
  loading = signal<boolean>(false);
  /** Current form mode: 'add' for new records, 'edit' for existing ones. */
  formMode = signal<'add' | 'edit'>('add');
  /** Initial data payload when editing a record. null for new records. */
  initialData = signal<any | null>(null);

  /** Referencia a la GridApi de AG Grid (se asigna en onGridReady). */
  gridApi!: GridApi;
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
    filter: true,
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
        colId: 'actions',
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

    this.loading.set(true);
    this.http.get<any>(this.apiUrl)
      .subscribe({
        next: (data) => {
          const mappedData = this.responseMapper(data);
          this.rowData.set(mappedData);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error cargando datos', err);
          this.rowData.set([]);
          this.loading.set(false);
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
    if (!this.resolvedPermissions().canExport) return;
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

    // Data rows (respects current filter). El TIPO de la celda lo decide la
    // colDef (fuente de verdad), NO el valor:
    // - cellDataType 'number' → número + numFmt moneda (el autor lo declaró monto/valor)
    // - cellDataType 'date'   → Date + numFmt fecha
    // - cellDataType 'boolean'→ TRUE/FALSE
    // - valueFormatter sin cellDataType → se aplica el display (texto formateado,
    //   p.ej. "etiqueta — nombre" o un código) — NO se fuerza número
    // - sin nada → valor crudo tipado (Date real, string ISO→Date, número SIN
    //   numFmt, boolean, resto texto)
    //
    // IMPORTANTE: el cellDataType se toma del INPUT ORIGINAL de la página
    // (this.columnDefs()), NO del colDef resuelto por AG Grid — AG Grid 34
    // INFIERE cellDataType automáticamente (toda columna numérica → 'number'),
    // lo que formatearía como moneda códigos/IDs no declarados.
    const declaredCellTypes = new Map<string, any>();
    this.columnDefs().forEach(col => {
      if (col.field) declaredCellTypes.set(col.field, col.cellDataType);
    });

    const firstValues: any[] = fields.map(() => null);
    this.gridApi.forEachNodeAfterFilter((node) => {
      if (node.data) {
        const row = fields.map((field, i) => {
          const v = field ? node.data[field] : undefined;
          const typed = this.toExcelValue(v, visibleColumns[i]?.getColDef(), node.data, declaredCellTypes.get(field ?? ''));
          if (firstValues[i] === null && typed !== null) firstValues[i] = typed;
          return typed;
        });
        ws.addRow(row);
      }
    });

    // numFmt por columna según el tipo resultante (montos/fechas DECLARADAS o
    // detectadas); los números NO declarados como monto quedan sin formato.
    const dataStartRow = headerRowIndex + 1;
    const dataRowCount = ws.actualRowCount - (dataStartRow - 1);
    fields.forEach((field, i) => {
      const sample = firstValues[i];
      const fmt = sample instanceof Date ? 'dd/mm/yyyy'
        : typeof sample === 'number' && declaredCellTypes.get(field ?? '') === 'number' ? '#,##0.00'
        : undefined;
      if (!fmt) return;
      for (let r = dataStartRow; r < dataStartRow + dataRowCount; r++) {
        ws.getCell(r, i + 1).numFmt = fmt;
      }
    });

    const filenameDate = formattedDate.replace(/-/g, '');
    const filename = `${this.title} ${filenameDate}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return { blob, filename };
  }

  /**
   * Convierte un valor crudo de la grilla al tipo real para la celda de Excel.
   * La colDef es la fuente de verdad (NO el tipo del valor):
   * - cellDataType DECLARADO 'number' → number (celda numérica)
   * - cellDataType DECLARADO 'date' → Date (celda de fecha)
   * - cellDataType DECLARADO 'boolean' → boolean (TRUE/FALSE)
   * - valueFormatter presente (sin cellDataType) → se respeta el display
   *   formateado (texto), p.ej. "etiqueta — nombre" en la columna de activo
   * - sin cellDataType ni valueFormatter → crudo tipado conservador:
   *   Date real / string ISO fecha → Date; boolean → boolean; number → number
   *   SIN numFmt; resto → string (o null si vacío)
   */
  private toExcelValue(v: any, colDef?: ColDef, rowData?: any, declaredCellDataType?: any): any {
    // 1) cellDataType DECLARADO por la página: autoridad (no la inferencia
    //    automática de AG Grid, que marcaría todo número como 'number').
    //    Va ANTES del valueFormatter porque el tipo declarado define el valor
    //    a exportar (p.ej. costo → number para fórmulas), aunque la columna
    //    también tenga un valueFormatter de display.
    if (declaredCellDataType === 'number') {
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''));
      return Number.isNaN(n) ? null : n;
    }
    if (declaredCellDataType === 'date') return this.toDateOrNull(v);
    if (declaredCellDataType === 'boolean') return Boolean(v);

    // 2) valueFormatter sin cellDataType: respetar el display de la columna
    //    (es string formateado; NO forzar número). Se pasa la fila completa
    //    para valueFormatters que combinan campos (p.ej. "etiqueta — nombre").
    //    Se aplica SIEMPRE, incluso con null/'' — el valueFormatter decide cómo
    //    representar el vacío (p.ej. badge de Estado → "Pendiente").
    if (typeof colDef?.valueFormatter === 'function') {
      const formatted = colDef.valueFormatter({ value: v, data: rowData } as any);
      return formatted ?? '';
    }

    // 3) Sin metadata: conversión conservadora por tipo del dato
    if (v == null || v === '') return null;
    if (v instanceof Date) return v;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v; // número crudo, sin numFmt
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '') return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        const d = new Date(trimmed);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    return v;
  }

  /** string ISO / Date → Date, o null si no es fecha válida. */
  private toDateOrNull(v: any): Date | null {
    const d = v instanceof Date ? v : new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
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
    // SDD permisos-proceso-evento-rol: validación de permiso además de la UI
    // (el botón se ve deshabilitado; esto cubre invocación directa).
    if (this.resolvedPermissions().readonly || !this.resolvedPermissions().canCreate) return;
    this.sidebarService.closeSidebar();
    this.formMode.set('add');
    this.initialData.set(null);
    this.isFormOpen.set(true);
    this.formOpened.emit({ mode: 'add', data: null });
  }

  /** Opens the sidebar in 'edit' mode pre-filled with the given record data. */
  onEdit(data: any) {
    if (!this.resolvedPermissions().canUpdate) return;
    this.sidebarService.closeSidebar();
    this.formMode.set('edit');

    if (this.editUrl) {
      const url = typeof this.editUrl === 'function' ? this.editUrl(data) : this.editUrl;
      this.http.get<any>(url).subscribe({
        next: (res) => {
          const detail = this.responseMapper(res);
          this.initialData.set(Array.isArray(detail) ? detail[0] ?? data : detail ?? data);
          this.isFormOpen.set(true);
          this.formOpened.emit({ mode: 'edit', data: this.initialData() });
        },
        error: () => {
          this.initialData.set(data);
          this.isFormOpen.set(true);
          this.formOpened.emit({ mode: 'edit', data: this.initialData() });
        }
      });
    } else {
      this.initialData.set(data);
      this.isFormOpen.set(true);
      this.formOpened.emit({ mode: 'edit', data: this.initialData() });
    }
  }

  /** Deletes a record after confirmation. Uses deleteUrl function or falls back to apiUrl/{id}. */
  onDelete(data: any) {
    if (!this.resolvedPermissions().canDelete) return;
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
          this.showRequestError(err, 'deleteError');
        }
      });
    });
  }

  /** Handles form submission from the sidebar. Sends POST (add) or PUT (edit) to the API. */
  async handleSubmit(formData: FormData) {
    const mode = this.formMode();
    const body = await this.buildRequestBody(formData, mode);

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

    // Hook opcional antes del PUT: permite al host confirmar/agregar datos
    // (p.ej. motivo obligatorio) o cancelar el guardado (devuelve false).
    if (this.beforeUpdate) {
      const proceed = await this.beforeUpdate(body, currentData);
      if (!proceed) return;
    }

    this.executeRequest('put', url, body, 'updateSuccess', 'updateError');
  }

  /**
   * Prepares the request body from FormData. Always returns a JSON object.
   * File-array fields are converted to base64 arrays: [{ name, size, type, base64 }, ...].
   * Single files are converted to { name, size, type, base64 }.
   */
  private async buildRequestBody(formData: FormData, mode: 'add' | 'edit'): Promise<Record<string, any>> {
    // Agrupar valores: detectar keys con múltiples Files (file-array)
    const entries = new Map<string, any[]>();
    formData.forEach((value, key) => {
      if (!entries.has(key)) entries.set(key, []);
      entries.get(key)!.push(value);
    });

    const data: Record<string, any> = {};

    for (const [key, values] of entries) {
      if (values.length > 0 && values[0] instanceof File) {
        // File-array: convertir cada File a base64
        const fileObjs = await Promise.all(
          values.map(async (f: File) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            base64: await this.fileToBase64(f),
          }))
        );
        data[key] = fileObjs;
      } else {
        data[key] = values[0];
      }
    }

    if (mode === 'add') {
      // Remove legacy ID generation for backends that auto-assign
      delete data['id'];
    }

    return data;
  }

  /** Convierte un File a base64 string (sin prefijo data:). */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Quitar prefijo "data:image/png;base64,"
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.substring(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
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
        this.showRequestError(err, errorKey);
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

  /**
   * Muestra el mensaje del error enviado por el BE (ApiResponse
   * { success, message, data }) cuando existe; si no, cae a la traducción
   * genérica. Así las validaciones de negocio del BE (p. ej. "la categoría
   * tiene N subcategorías") llegan al usuario con el texto real.
   */
  private showRequestError(
    err: any,
    errorKey: keyof DynamicFormsTranslations['crud']
  ): void {
    const message = err?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      this.snackBar.open(message, this.t().snackbar.close, { duration: 5000 });
      return;
    }
    this.showSnack(errorKey);
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
