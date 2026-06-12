import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudManagerComponent, FormConfig } from '@dynamic-forms-lib';
import { ColDef } from 'ag-grid-community';

@Component({
    selector: 'app-pokemon-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, CrudManagerComponent],
    templateUrl: './pokemon-page.component.html',
    styleUrls: ['./pokemon-page.component.css']
})
export class PokemonPageComponent {
    responseMapper = (res: any) => res.results.map((p: any, index: number) => ({
        ...p,
        id: index + 1 // Generate a mock ID
    }));

    formConfig: FormConfig = {
        layout: 'tabs',
        groups: [
            {
                label: 'Pokemon Details',
                type: 'tabs',
                fields: [
                    { type: 'text', label: 'Name', name: 'name', gridCols: 12, validations: { required: true } },
                    { type: 'text', label: 'URL', name: 'url', gridCols: 12 },
                ]
            }
        ]
    };

    columnDefs: ColDef[] = [
        { headerName: 'Name', field: 'name', sortable: true, filter: true },
        { headerName: 'URL', field: 'url', sortable: true, filter: true, flex: 1 }
    ];

    // URL Configuration
    createUrl = 'https://pokeapi.co/api/v2/pokemon';
    deleteUrlBuilder = (data: any) => `https://pokeapi.co/api/v2/pokemon/${data.id || 0}`;
    updateUrlBuilder = (data: any) => `https://pokeapi.co/api/v2/pokemon/${data.id || 0}`;
}
