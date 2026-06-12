# Rule: Dynamic Forms Design Patterns

This project utilizes the `dynamic-forms-lib` to standardize CRUD operations and UI consistency. All new maintenance pages MUST follow these rules.

## 1. Architectural Requirements
- **Library Centric**: Use `CrudManagerComponent` from `@dynamic-forms-lib` for all entity management pages.
- **Standalone Components**: All pages must be Angular Standalone Components.
- **Change Detection**: Use `changeDetection: ChangeDetectionStrategy.OnPush` for performance and consistency.
- **No Manual HTML**: Avoid writing custom HTML for forms or data grids. Rely on `FormConfig` and `ColDef[]` configurations.

## 2. UI & Design Patterns
- **Layout Selection**:
    - Use `layout: 'tabs'` or `layout: 'steps'` for forms with more than 5-6 fields to avoid cognitive overload.
    - Group related fields logically into groups.
- **Responsive Grid**:
    - Use `gridCols` to manage field widths (1-12 scale).
    - Standard: `gridCols: 6` for two columns, `gridCols: 12` for full width.
- **Visual Feedback**:
    - Use `suffix` (icons/text) for fields like emails, phones, or URLs to enhance the "premium" feel.
    - Leverage `visibleIf` for dynamic form behavior instead of manual `*ngIf` in templates.

## 3. Naming & Structure
- **Directory**: `src/app/pages/[entity]-page/`
- **Component Class**: `[Entity]PageComponent`
- **Selector**: `app-[entity]-page`
- **Routing**: Always nest pages under `MainLayoutComponent` in `app.routes.ts`.

## 4. Maintenance
- After adding or modifying pages, run `graphify update .` to keep the architecture map current.
