# Workflow: Create Dynamic CRUD Page

Follow these steps to create a new entity management page using the `dynamic-forms-lib`.

## Steps

1. **Generate Component**:
   Run `ng g c pages/[entity]-page --standalone --inline-style --inline-template=false`
   *Note: Use `--inline-style` if no complex CSS is needed, as per project patterns.*

2. **Configure Component**:
   - Open `[entity]-page.component.ts`.
   - Add `CrudManagerComponent` to `imports`.
   - Set `changeDetection: ChangeDetectionStrategy.OnPush`.
   - Define `formConfig: FormConfig` with groups and fields.
   - Define `columnDefs: ColDef[]`.
   - Set `apiUrl`, `createUrl`, `updateUrlBuilder`, and `deleteUrlBuilder`.

3. **Template**:
   - In `[entity]-page.component.html`, add:
     ```html
     <app-crud-manager 
       [title]="'Management of [Entity]'"
       [formConfig]="formConfig" 
       [columnDefs]="columnDefs" 
       [apiUrl]="apiUrl"
       [createUrl]="createUrl" 
       [updateUrl]="updateUrlBuilder"
       [deleteUrl]="deleteUrlBuilder">
     </app-crud-manager>
     ```

4. **Routing**:
   - Open `src/app/app.routes.ts`.
   - Add the new route under the `children` of `MainLayoutComponent`.

5. **Finalize**:
   - Run `graphify update .`
