# Dynamic Forms App - AI Coding Agent Guidelines

## Architecture Overview

**Dynamic Forms App** is an Angular 20 standalone application for building CRUD interfaces with dynamically-generated forms and data grids. The architecture revolves around **form configuration as data** rather than static components.

### Core Pattern: Configuration-Driven UI
- **FormConfig** (see `src/app/types/dynamic-form.types.ts`) defines form structure declaratively: groups, fields, validations, API bindings
- **FormsComponent** (`src/app/components/forms.component/`) renders forms from config using Angular Reactive Forms
- **CrudManagerComponent** (`src/app/components/crud-manager.component/`) wraps a form + ag-grid table for full CRUD workflows
- **FieldComponent** (`src/app/components/field.component/`) renders individual fields dynamically based on type (text, select, autocomplete, date, etc.)

### Data Flow: Pages → CRUD Manager → Form + Grid
```
PersonasPage (page component with FormConfig)
  ↓
CrudManagerComponent (manages form + grid state, HTTP calls)
  ├→ FormsComponent (builds Reactive Form from config)
  │   └→ FieldComponent (renders each field)
  └→ AgGridAngular (displays fetched data, triggers edit/delete)
```

### Key Services
- **DynamicOptionsService** (`src/app/services/dynamic-options.service.ts`): Fetches dropdown/autocomplete options from APIs, handles nested property resolution and dependent field chains
- **ThemeService**: Manages light/dark mode and ag-grid theme switching (persists to localStorage)
- **SidebarService**: Toggle sidebar state via signals (cross-component communication)

## Critical Patterns & Workflows

### 1. Dependent Dropdown Fields
In `personas-page.component.ts`, the **currency** field depends on the **country** field:
```typescript
{
  type: 'select',
  name: 'currency',
  api: {
    endpoint: 'https://restcountries.com/v3.1/alpha/{cca2}',
    dependsOn: 'country',      // Watch this field
    queryParam: 'cca2'          // Pass its value as query param
  }
}
```
**Implementation detail**: When the parent field changes, `DynamicOptionsService.fetchOptions()` is called with the dependent value. The field clears if dependency is null (line ~90 in field.component.ts).

### 2. Dynamic Option Mapping
The service handles three patterns:
- **Simple 1:1** (default): `valueKey: 'id'`, `labelKey: 'name'`
- **Nested paths**: `valueKey: 'user.id'`, `labelKey: 'user.profile.name'`
- **1:N (iterate object)**: `valueKey: 'currencies.*'`, `labelKey: 'currencies.*.name'` — flattens object keys into options (e.g., iterate currency codes)

See `DynamicOptionsService.handleOneToManyMapping()` for the object iteration logic.

### 3. Theme Management & AG-Grid Theme Selection
The **ThemeService** manages both Material Design themes and AG-Grid themes dynamically:
- **Material themes**: Light/dark mode with 12 color palettes (persisted in localStorage)
- **AG-Grid themes**: Alpine, Material, Balham, Quartz — synchronized across all CRUD grids
- **ThemeSettingsComponent** (`src/app/components/theme-settings/`) provides UI controls for both
- **CrudManagerComponent** reacts to theme changes via signals: when `themeService.agGridTheme()` or `isDarkMode()` changes, the grid's CSS class updates automatically (`ag-theme-${name}` or `ag-theme-${name}-dark`)
- Theme choices persist across sessions (localStorage)

**Key implementation**: 
```typescript
// In CrudManagerComponent constructor and effect:
effect(() => {
  const baseTheme = this.themeService.agGridTheme();
  const isDark = this.themeService.isDarkMode();
  this.agGridTheme.set(isDark ? `ag-theme-${baseTheme}-dark` : `ag-theme-${baseTheme}`);
});
// In HTML: <div class="grid-container" [ngClass]="agGridTheme()">
```

### 4. Standalone Components & OnPush Change Detection
- All components use `standalone: true` and `ChangeDetectionStrategy.OnPush`
- State management relies on **Angular Signals** (modern reactive primitive) instead of RxJS subjects
- Form validation is **Reactive Forms** with validators applied during form build (see `FormsComponent.buildForm()`)

### 4. File Uploads in Forms
- Files are stored in a **Map** within FormsComponent (`files = new Map<string, File>()`)
- FormData is built on submit and POSTed directly (not stored in form control)
- Edit mode re-uploads files if changed; unchanged files reuse existing data

### 5. CRUD Operations Flow
1. **Create**: Open empty form, submit → POST to `apiUrl` → fetch grid data
2. **Read**: Grid fetched via `CrudManagerComponent.loadData()` with `responseMapper` to extract array
3. **Update**: Click row action → populate form with `initialData` in edit mode → PUT to API
4. **Delete**: Confirmation dialog → DELETE to API → refresh grid

## Development Commands & Conventions

### Build & Run
```bash
npm start          # ng serve (dev server http://localhost:4200)
npm run build      # Production build to dist/
npm run watch      # Watch mode (useful for debugging tests)
npm test           # Karma + Jasmine runner
```

### File Organization
- **Pages** (`src/app/pages/*/`): Route components, each defines its own FormConfig and column defs
- **Components** (`src/app/components/*/`): Reusable UI pieces (forms, fields, CRUD manager)
- **Services** (`src/app/services/`): Shared business logic (options fetching, theme, sidebar)
- **Types** (`src/app/types/dynamic-form.types.ts`): TypeScript interfaces for FormConfig, FieldConfig, ApiConfig

### Testing Convention
- Spec files are colocated: `field.component.spec.ts` next to `field.component.ts`
- Tests use Jasmine; run with `npm test`

## Integration Points & External Dependencies

### External APIs
- **RestCountries** (`https://restcountries.com/v3.1/...`): Populate country/currency dropdowns
- **Pokémon API**, **Star Wars API**, **Olympics (json-server)**: Example data sources for demo pages

### JSON-Server
- `db.json` contains mock data; `json-server` runs locally for CRUD testing
- Used in olympics-page, personas-page workflows

### Material Design & ag-Grid
- **Material**: Form fields, dialogs, buttons, toolbar, sidenav
- **ag-Grid Community**: Data grid with sorting, filtering, export (CSV), custom cell renderers (action buttons)
- Theme selection applies Material palette + ag-grid theme simultaneously

## Debugging Tips

### Form Not Rendering?
1. Check FormConfig structure in page component (must have `groups` with `fields`)
2. Verify FieldComponent handles the `type` (see switch statement in template)
3. Enable Change Detection: manually call `cdr.markForCheck()` if OnPush is not detecting changes

### Dropdown Options Empty?
1. Check API endpoint URL is correct and CORS-enabled
2. Verify `valueKey` and `labelKey` match actual response structure (use browser DevTools)
3. For dependent fields: confirm parent field's value is not null
4. Check `DynamicOptionsService.resolveProperty()` correctly navigates nested paths

### Grid Actions Not Triggering?
1. Ensure `showActions: true` in CrudManagerComponent input
2. Verify `columnDefs` includes action cell: `{ cellRenderer: ActionCellRendererComponent }`
3. Check HTTP error handling in `loadData()` — snackbar errors may be dismissed

## Code Style & Conventions

- **Naming**: camelCase for variables/methods, PascalCase for classes/interfaces
- **Imports**: Group by `@angular/*`, third-party, local services, local types
- **OnPush + Signals**: Never use `ChangeDetectorRef.detectChanges()`; rely on signals to trigger updates
- **Validators**: Use Angular validators (required, minLength, email, pattern); custom validators added in `buildForm()`
- **Observable subscribing**: Prefer `tap()` and `catchError()` in pipes; unsubscribe handled by component cleanup (or use async pipe in templates when possible)

## Common Tasks

### Adding a New CRUD Page
1. Create page component in `src/app/pages/your-page/`
2. Define `FormConfig` with field definitions
3. Define `ColDef[]` array for ag-grid columns
4. Import `CrudManagerComponent` and pass config + apiUrl
5. Add route in `app.routes.ts` with lazy loading

### Adding a Dynamic Dropdown
1. Add field to FormConfig with `type: 'select' | 'autocomplete'`
2. Set `api.endpoint`, `api.valueKey`, `api.labelKey`
3. For dependent dropdown: set `api.dependsOn` and `api.queryParam`
4. FieldComponent handles the subscription automatically

### Styling & Theming
- CSS files colocated with components (not global)
- Material theme applied in `index.html` or via `ThemeService` signals
- Use Material variables (--mdc-* custom properties) for consistency

