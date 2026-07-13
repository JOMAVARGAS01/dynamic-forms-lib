import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileArrayField } from '../../types/dynamic-form.types';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';

@Component({
  selector: 'app-file-array',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './file-array.component.html',
  styleUrls: ['./file-array.component.css'],
})
/**
 * Multi-file upload control with thumbnail preview, per-file delete, and progress indicator.
 * Manages files via a signal array; emits the full File[] on every change.
 */
export class FileArrayComponent {
  /** Field configuration for validation constraints (accept, maxSize, maxFiles). */
  @Input({ required: true }) field!: FileArrayField;

  @Output() filesChange = new EventEmitter<File[]>();

  files = signal<File[]>([]);
  /** Object URLs keyed by file name for thumbnail preview. */
  previewUrls = signal<Map<string, string>>(new Map());

  private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
  t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

  get maxFilesError(): string {
    const max = this.field.maxFiles ?? Infinity;
    return this.t().fileArray.maxFilesError.replace('{max}', String(max));
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const current = this.files();
    const maxFiles = this.field.maxFiles ?? Infinity;
    const remaining = maxFiles - current.length;

    if (remaining <= 0) {
      input.value = '';
      return;
    }

    const newFiles = Array.from(input.files).slice(0, remaining);
    const updated = [...current, ...newFiles];

    // Create preview URLs for new files
    const urls = new Map(this.previewUrls());
    for (const file of newFiles) {
      if (!urls.has(file.name)) {
        urls.set(file.name, URL.createObjectURL(file));
      }
    }
    this.previewUrls.set(urls);
    this.files.set(updated);
    this.filesChange.emit(updated);

    input.value = '';
  }

  deleteFile(index: number) {
    const current = this.files();
    const file = current[index];
    if (!file) return;

    // Revoke object URL
    const urls = this.previewUrls();
    const url = urls.get(file.name);
    if (url) {
      URL.revokeObjectURL(url);
      const updatedUrls = new Map(urls);
      updatedUrls.delete(file.name);
      this.previewUrls.set(updatedUrls);
    }

    const updated = current.filter((_, i) => i !== index);
    this.files.set(updated);
    this.filesChange.emit(updated);
  }

  getPreviewUrl(file: File): string {
    return this.previewUrls().get(file.name) ?? '';
  }

  /** Check if file is an image based on MIME type */
  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /** Get icon name based on file type */
  getFileIcon(file: File): string {
    const type = file.type;
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word') || type.includes('document')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    if (type.includes('text')) return 'article';
    return 'insert_drive_file';
  }

  /** Format file size to human readable */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /** Open file in a new tab */
  openFile(file: File) {
    const url = this.previewUrls().get(file.name);
    if (url) window.open(url, '_blank');
  }
}
