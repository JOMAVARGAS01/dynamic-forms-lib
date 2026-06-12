import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudManagerComponent, FormConfig } from '@dynamic-forms-lib';
import { ColDef } from 'ag-grid-community';

@Component({
    selector: 'app-star-wars-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, CrudManagerComponent],
    templateUrl: './star-wars-page.component.html',
    styleUrls: ['./star-wars-page.component.css']
})
export class StarWarsPageComponent {
    responseMapper = (res: any) => res.results.map((p: any, index: number) => ({
        ...p,
        id: index + 1 // Generate a mock ID
    }));

    formConfig: FormConfig = {
        layout: 'tabs',
        groups: [
            {
                label: 'Character Info',
                type: 'tabs',
                fields: [
                    { type: 'text', label: 'Name', name: 'name', gridCols: 6, validations: { required: true } },
                    { type: 'text', label: 'Height', name: 'height', gridCols: 6 },
                    { type: 'text', label: 'Mass', name: 'mass', gridCols: 6 },
                    { type: 'text', label: 'Hair Color', name: 'hair_color', gridCols: 6 },
                ]
            }
        ]
    };

    columnDefs: ColDef[] = [
        { headerName: 'Name', field: 'name', sortable: true, filter: true },
        { headerName: 'Height', field: 'height', sortable: true, filter: true },
        { headerName: 'Mass', field: 'mass', sortable: true, filter: true },
        { headerName: 'Hair Color', field: 'hair_color', sortable: true, filter: true }
    ];
    // URL Configuration
    createUrl = 'https://swapi.dev/api/people';
    // Star Wars API (SWAPI) is read-only usually, so this is just a simulation
    deleteUrlBuilder = (data: any) => `https://swapi.dev/api/people/${data.id}/`;
    updateUrlBuilder = (data: any) => `https://swapi.dev/api/people/${data.id}/`;
}
