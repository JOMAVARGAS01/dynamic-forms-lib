import { Component, inject, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ThemeService, AVAILABLE_PALETTES, AVAILABLE_AG_GRID_THEMES, ThemeMode, AgGridTheme } from '@dynamic-forms-lib';

@Component({
  selector: 'app-theme-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './theme-settings.component.html',
  styleUrls: ['./theme-settings.component.css']
})
export class ThemeSettingsComponent {
  @Output() close = new EventEmitter<void>();
  themeService = inject(ThemeService);
  availablePalettes = AVAILABLE_PALETTES;
  availableAgGridThemes = AVAILABLE_AG_GRID_THEMES;

  onModeChange(mode: ThemeMode) {
    this.themeService.setMode(mode);
  }

  onPaletteChange(palette: string) {
    this.themeService.setPalette(palette);
  }

  onAgGridThemeChange(theme: AgGridTheme) {
    this.themeService.setAgGridTheme(theme);
  }

  getPaletteColor(paletteValue: string): string {
    // Map palette names to approximate hex colors for the UI preview
    const colorMap: { [key: string]: string } = {
      'red-palette': '#ef0000',
      'green-palette': '#038b00',
      'blue-palette': '#5a64ff',
      'yellow-palette': '#7b7b00',
      'cyan-palette': '#008585',
      'magenta-palette': '#d200d2',
      'orange-palette': '#bc5d00',
      'chartreuse-palette': '#418700',
      'spring-green-palette': '#008942',
      'azure-palette': '#0074e9',
      'violet-palette': '#944aff',
      'rose-palette': '#e80074'
    };
    return colorMap[paletteValue] || '#2196f3';
  }
}
