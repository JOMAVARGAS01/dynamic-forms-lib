# Changelog

All notable changes to @dynamic-forms-lib/core will be documented in this file.

## [0.1.1] - 2026-06-12

### Fixed
- **File upload**: CrudManagerComponent.handleSubmit now sends FormData (multipart) when files are present, instead of silently discarding them. Falls back to JSON when no files exist.

### Added
- **JSDoc**: Complete documentation on all public APIs (components, services, types)

## [0.1.0] - 2025-12-11

### Added

- **CrudManagerComponent**: Full CRUD with AG Grid table, dynamic form modal, Excel export, quick search, pagination
- **FormsComponent**: Dynamic form renderer with 4 layouts (tabs, accordion, simple, steps)
- **FieldComponent**: 18 field types (text, number, email, password, tel, url, color, time, week, month, textarea, date, select, autocomplete, checkbox, checkbox-multiple, radio, switch, file)
- **ThemeService**: 12 color palettes, light/dark/system modes, 4 AG Grid themes, localStorage persistence
- **DynamicOptionsService**: Remote options loading via API with cascading dependencies, one-to-many mapping
- **SidebarService**: Sidebar open/close state management
- **ConfirmationDialogComponent**: Reusable confirmation dialog for delete operations
- **ActionCellRendererComponent**: AG Grid cell renderer for edit/delete actions
- **Conditional visibility**: `visibleIf` field configuration
- **Read-only fields**: `readonly` property per field
- **Prefix/suffix**: Icon and text decorations on input fields
- **Validation**: required, minLength, maxLength, pattern, min, max, email
- **Dynamic options**: API-driven select/autocomplete with `dependsOn` cascading
- **Local dependent options**: `dependentOptions.map` for local cascading selects
- **Excel export**: Styled Excel export with title, date, headers, and column sizing via ExcelJS
- **Global appearance token**: `FORM_FIELD_APPEARANCE_TOKEN` for fill/outline configuration
- **Standalone components**: All components are Angular standalone (no NgModules)
- **OnPush change detection**: All components use ChangeDetectionStrategy.OnPush
- **MIT License**
