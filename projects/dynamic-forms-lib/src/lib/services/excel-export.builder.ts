/**
 * Single Excel (exceljs) export builder shared by this library
 * (`<app-crud-manager>`) and by consuming apps that export grids to .xlsx.
 *
 * It centralizes the sheet layout (title, date, headers, data rows), the
 * ACCENT COLORS taken from the app's active color palette, and the browser
 * download. Before this builder existed, the exact same layout + styling
 * block was copy-pasted in the CrudManager and in each app exporter.
 *
 * Sheet structure (identical across every export of the project):
 *
 * | Row | Content                                                     |
 * |-----|-------------------------------------------------------------|
 * | 1   | Title (merged, text colored with the active palette)        |
 * | 2   | Generation date (+ optional second text in column 2)        |
 * | 3   | (empty)                                                     |
 * | 4   | Column headers (solid fill with palette primary, on-primary text) |
 * | 5+  | Data rows                                                   |
 *
 * The accent is resolved at runtime from the CSS custom properties
 * `--mat-sys-primary` / `--mat-sys-on-primary` that the consuming app defines
 * in its `styles.scss` for each `body.<palette>.light-theme|.dark-theme`
 * combination (a contract this library already assumes). Apps that do not
 * define those variables keep the historical blue — exports keep working.
 * Callers can also pass an explicit `accent` to override the resolution.
 */
import * as ExcelJS from 'exceljs';

/** Primitive cell value understood by exceljs. */
export type ExcelCellValue = string | number | boolean | Date | null | undefined;

/** ARGB colors for the title and the header row. */
export interface ExcelAccent {
  /** Solid fill of the header row. */
  headerFillArgb: string;
  /** Text color of the header row. */
  headerTextArgb: string;
  /** Text color of the title row (title never gets a fill). */
  titleColorArgb: string;
}

export interface ExcelExportOptions {
  /** Worksheet name. Default: 'Datos'. */
  sheetName?: string;
  /** Title (row 1, merged across all columns). */
  title: string;
  /** Title font size. Default: 20. */
  titleSize?: number;
  /** Row 2, column 1 text. Default: `Generated: YYYY-MM-DD`. */
  dateLine?: string;
  /** Optional row 2, column 2 text (e.g. the processed period). */
  dateLineCol2?: string;
  /** Column headers (row 4), in the same order as every data row. */
  headers: string[];
  /** Data rows, starting at row 5. */
  rows: ExcelCellValue[][];
  /** Optional cell numFmt per column (same order as `headers`). */
  numFmts?: (string | undefined)[];
  /** Download file name (.xlsx). */
  filename: string;
  /** Explicit accent override. Default: resolved from the app palette. */
  accent?: ExcelAccent;
}

const FALLBACK_HEADER_FILL_ARGB = 'FF4F81BD';
const FALLBACK_HEADER_TEXT_ARGB = 'FFFFFFFF';

function toArgb(value: string): string {
  const hex = value.trim().replace('#', '').toUpperCase();
  return hex.length === 6 ? `FF${hex}` : hex;
}

/** Resolves the accent of the active palette from the <body> custom properties. */
export function resolveExcelAccent(): ExcelAccent {
  const computed = typeof document !== 'undefined' ? getComputedStyle(document.body) : null;
  const primary = computed?.getPropertyValue('--mat-sys-primary').trim() ?? '';
  const onPrimary = computed?.getPropertyValue('--mat-sys-on-primary').trim() ?? '';
  const headerFill = primary ? toArgb(primary) : FALLBACK_HEADER_FILL_ARGB;
  return {
    headerFillArgb: headerFill,
    headerTextArgb: onPrimary ? toArgb(onPrimary) : FALLBACK_HEADER_TEXT_ARGB,
    titleColorArgb: headerFill,
  };
}

/** Builds the workbook, writes it and triggers the browser download. */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const accent = options.accent ?? resolveExcelAccent();
  const today = new Date().toISOString().split('T')[0];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(options.sheetName ?? 'Datos');

  // Row 1: title (merged)
  ws.mergeCells(1, 1, 1, Math.max(1, options.headers.length));
  const titleCell = ws.getCell(1, 1);
  titleCell.value = options.title;
  titleCell.font = {
    size: options.titleSize ?? 20,
    bold: true,
    color: { argb: accent.titleColorArgb },
  };

  // Row 2: date (+ optional second column)
  const dateCell = ws.getCell(2, 1);
  dateCell.value = options.dateLine ?? `Generated: ${today}`;
  dateCell.font = { bold: true };
  if (options.dateLineCol2) {
    const secondCell = ws.getCell(2, 2);
    secondCell.value = options.dateLineCol2;
    secondCell.font = { bold: true };
  }

  // Row 4: headers
  const headerRow = ws.getRow(4);
  headerRow.values = options.headers;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: accent.headerTextArgb } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: accent.headerFillArgb },
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Data rows
  for (const row of options.rows) {
    ws.addRow(row);
  }

  // numFmt per column (data rows start at row 5)
  options.numFmts?.forEach((fmt, colIdx) => {
    if (!fmt) return;
    for (let r = 5; r < 5 + options.rows.length; r++) {
      ws.getCell(r, colIdx + 1).numFmt = fmt;
    }
  });

  // Column widths
  ws.columns = options.headers.map((h, i) => ({
    width: Math.min(
      Math.max(h.length, ...options.rows.map((r) => String(r[i] ?? '').length)) + 5,
      50
    ),
  }));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
