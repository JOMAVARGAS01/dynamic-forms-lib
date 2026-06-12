import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AgGridTheme = 'alpine' | 'material' | 'balham' | 'quartz';

export const AVAILABLE_PALETTES = [
    { name: 'Red', value: 'red-palette' },
    { name: 'Green', value: 'green-palette' },
    { name: 'Blue', value: 'blue-palette' },
    { name: 'Yellow', value: 'yellow-palette' },
    { name: 'Cyan', value: 'cyan-palette' },
    { name: 'Magenta', value: 'magenta-palette' },
    { name: 'Orange', value: 'orange-palette' },
    { name: 'Chartreuse', value: 'chartreuse-palette' },
    { name: 'Spring Green', value: 'spring-green-palette' },
    { name: 'Azure', value: 'azure-palette' },
    { name: 'Violet', value: 'violet-palette' },
    { name: 'Rose', value: 'rose-palette' }
];

export const AVAILABLE_AG_GRID_THEMES = [
    { name: 'Alpine', value: 'alpine' as AgGridTheme },
    { name: 'Material', value: 'material' as AgGridTheme },
    { name: 'Balham', value: 'balham' as AgGridTheme },
    { name: 'Quartz', value: 'quartz' as AgGridTheme }
];

@Injectable({
    providedIn: 'root'
})
/** Root service managing visual theme: light/dark/system mode, color palette, and AG-Grid theme. Persists settings to localStorage. */
export class ThemeService {
    private platformId = inject(PLATFORM_ID);

    /** Current theme mode: 'light', 'dark', or 'system' (follows OS preference). */
    themeMode = signal<ThemeMode>('system');
    /** Active color palette CSS class name. */
    activePalette = signal<string>('azure-palette');
    /** Whether dark mode is currently active (resolved from mode + system preference). */
    isDarkMode = signal<boolean>(false);
    /** Active AG-Grid visual theme variant (alpine, material, balham, quartz). */
    agGridTheme = signal<AgGridTheme>('material');

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
            const savedPalette = localStorage.getItem('theme-palette');
            const savedAgGridTheme = localStorage.getItem('ag-grid-theme') as AgGridTheme;

            if (savedMode) this.themeMode.set(savedMode);
            if (savedPalette) this.activePalette.set(savedPalette);
            if (savedAgGridTheme) this.agGridTheme.set(savedAgGridTheme);

            const currentMode = this.themeMode();
            let initialIsDark = currentMode === 'dark';
            if (currentMode === 'system') {
                initialIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            this.isDarkMode.set(initialIsDark);

            this.applyTheme(this.themeMode(), this.activePalette());

            effect(() => {
                const mode = this.themeMode();
                const palette = this.activePalette();

                this.applyTheme(mode, palette);

                localStorage.setItem('theme-mode', mode);
                localStorage.setItem('theme-palette', palette);
            });

            effect(() => {
                const agTheme = this.agGridTheme();
                localStorage.setItem('ag-grid-theme', agTheme);
            });

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.themeMode() === 'system') {
                    this.applyTheme('system', this.activePalette());
                }
            });
        }
    }

    /** Sets the theme mode and applies it immediately. */
    setMode(mode: ThemeMode) {
        this.themeMode.set(mode);
    }

    /** Sets the active color palette and applies it immediately. */
    setPalette(palette: string) {
        this.activePalette.set(palette);
    }

    /** Sets the AG-Grid visual theme and persists it. */
    setAgGridTheme(theme: AgGridTheme) {
        this.agGridTheme.set(theme);
    }

    private applyTheme(mode: ThemeMode, palette: string) {
        const body = document.body;
        AVAILABLE_PALETTES.forEach(p => body.classList.remove(p.value));
        body.classList.add(palette);

        let isDark = mode === 'dark';
        if (mode === 'system') {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        this.isDarkMode.set(isDark);

        if (isDark) {
            body.classList.add('dark-theme');
            body.classList.remove('light-theme');
        } else {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
        }
    }
}
