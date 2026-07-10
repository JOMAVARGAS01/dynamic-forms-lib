import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudManagerComponent, FormConfig } from '@dynamic-forms-lib';
import { ColDef } from 'ag-grid-community';
import { MatChipsModule } from '@angular/material/chips';

@Component({
    selector: 'app-personas-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, CrudManagerComponent, MatChipsModule],
    templateUrl: './personas-page.component.html',
    styleUrls: ['./personas-page.component.css']
})
export class PersonasPageComponent {
    formConfig: FormConfig = {
        layout: 'steps',
        groups: [
            {
                label: 'Datos Personales',
                type: 'tabs',
                fields: [
                    {
                        type: 'text',
                        label: 'Nombre',
                        name: 'nombre',
                        gridCols: 6,
                        validations: { required: true },
                    },
                    { type: 'text', label: 'Apellido', name: 'apellido', gridCols: 6 },
                    {
                        type: 'date',
                        label: 'Fecha de nacimiento',
                        name: 'fechaNacimiento',
                        gridCols: 6,
                        validations: { required: true },
                    },
                    {
                        type: 'select',
                        label: 'Género',
                        name: 'genero',
                        gridCols: 3,
                        options: [
                            { label: 'Masculino', value: 'M' },
                            { label: 'Femenino', value: 'F' },
                        ],
                        validations: { required: true },
                    },
                    {
                        type: 'select',
                        label: 'Saludo',
                        name: 'saludo',
                        gridCols: 3,
                        dependentOptions: {
                            field: 'genero',
                            map: {
                                'M': [
                                    { label: 'Señor', value: '1' },
                                    { label: 'Estimado', value: '2' }
                                ],
                                'F': [
                                    { label: 'Señora', value: '3' },
                                    { label: 'Señorita', value: '4' },
                                    { label: 'Estimada', value: '5' }
                                ]
                            }
                        }
                    },
                    {
                        type: 'select',
                        label: 'Saludo (API)',
                        name: 'saludo1',
                        gridCols: 3,
                        api: {
                            endpoint: 'http://localhost:3002/saludos',
                            dependsOn: 'genero',
                            queryParam: 'genero',
                            labelKey: 'label',
                            valueKey: 'value'
                        }
                    },
                    {
                        type: 'number',
                        label: 'Edad',
                        name: 'edad',
                        gridCols: 3,
                        validations: { min: 0, max: 120 },
                    },
                    { type: 'textarea', label: 'Biografía', name: 'bio', gridCols: 12 },
                ],
            },
            {
                label: 'Ubicación (API Dinámica)',
                type: 'tabs',
                fields: [
                    {
                        type: 'autocomplete',
                        name: 'country',
                        label: 'País (Cargado desde API Restcountries)',
                        gridCols: 6,
                        api: {
                            endpoint: 'https://restcountries.com/v3.1/all?fields=name,cca2',
                            labelKey: 'name.common',
                            valueKey: 'cca2',
                        },
                        validations: { required: true },
                    },
                    {
                        type: 'select',
                        name: 'currency',
                        label: 'Moneda (Dependiente del País)',
                        gridCols: 6,
                        api: {
                            endpoint: 'https://restcountries.com/v3.1/alpha',
                            dependsOn: 'country',
                            queryParam: 'codes',
                            labelKey: 'currencies.*.name',
                            valueKey: 'currencies.*.code',
                        },
                    },
                ],
            },
            {
                label: 'Contacto',
                type: 'tabs',
                fields: [
                    {
                        type: 'tel',
                        label: 'Teléfono',
                        name: 'telefono',
                        gridCols: 6,
                        suffix: { icon: 'phone', isIcon: true }
                    },
                    {
                        type: 'url',
                        label: 'Sitio Web',
                        name: 'website',
                        gridCols: 6,
                        suffix: { icon: 'public', isIcon: true }
                    },
                    {
                        type: 'email',
                        label: 'Email',
                        name: 'email',
                        gridCols: 6,
                        suffix: { icon: 'email', isIcon: true },
                        validations: { required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
                    },
                    { type: 'text', label: 'Ciudad', name: 'ciudad', gridCols: 12 },
                    { type: 'text', label: 'Dirección', name: 'direccion', gridCols: 12 },
                    { type: 'checkbox', label: 'Suscribirse a newsletter', name: 'newsletter', gridCols: 12 },
                ],
            },
            {
                label: 'Otros Datos',
                type: 'tabs',
                fields: [
                    {
                        type: 'checkbox-multiple',
                        label: 'Intereses',
                        name: 'intereses',
                        gridCols: 12,
                        options: [
                            { label: 'Música', value: 'music' },
                            { label: 'Deportes', value: 'sports' },
                            { label: 'Lectura', value: 'reading' }
                        ]
                    },
                    {
                        type: 'radio',
                        label: 'Estado civil',
                        name: 'estadoCivil',
                        gridCols: 12,
                        options: [
                            { label: 'Soltero', value: 'S' },
                            { label: 'Casado', value: 'C' },
                            { label: 'Divorciado', value: 'D' }
                        ],
                        validations: { required: true }
                    },
                    { type: 'textarea', label: 'Observaciones', name: 'observaciones', gridCols: 12 },
                    { type: 'file', label: 'Archivo CV', name: 'archivo', gridCols: 12 },
                ],
            },
            {
                label: 'Opcionales',
                type: 'tabs',
                fields: [
                    { type: 'switch', label: 'Activo', name: 'activo', gridCols: 12 },
                    {
                        type: 'text',
                        label: 'Código promocional',
                        name: 'promo',
                        gridCols: 6,
                        visibleIf: { field: 'activo', value: true },
                    },
                    {
                        type: 'text',
                        label: 'Referido por',
                        name: 'referido',
                        gridCols: 6,
                        visibleIf: { field: 'activo', value: true },
                    },
                ],
            },
            {
                label: 'Cuentas Bancarias (form-array smoke)',
                type: 'simple',
                fields: [
                    {
                        type: 'form-array',
                        name: 'cuentasBancarias',
                        label: 'Cuentas bancarias',
                        gridCols: 12,
                        minItems: 1,
                        itemTitle: 'Cuenta #{{index}} - {{banco}}',
                        addButtonLabel: 'Agregar cuenta',
                        removeButtonLabel: 'Quitar cuenta',
                        confirmRemoveMessage: '¿Está seguro de que desea eliminar esta cuenta?',
                        defaultItem: { pais: 'AR', moneda: 'ARS' },
                        fields: [
                            {
                                type: 'text',
                                label: 'Banco',
                                name: 'banco',
                                gridCols: 6,
                                validations: { required: true },
                            },
                            {
                                type: 'text',
                                label: 'Número de cuenta',
                                name: 'numero',
                                gridCols: 6,
                                validations: { required: true },
                            },
                            {
                                type: 'select',
                                label: 'País',
                                name: 'pais',
                                gridCols: 4,
                                options: [
                                    { label: 'Argentina', value: 'AR' },
                                    { label: 'Brasil', value: 'BR' },
                                    { label: 'Chile', value: 'CL' },
                                ],
                                validations: { required: true },
                            },
                            {
                                type: 'select',
                                label: 'Moneda',
                                name: 'moneda',
                                gridCols: 4,
                                dependentOptions: {
                                    field: 'pais',
                                    map: {
                                        AR: [
                                            { label: 'Peso Argentino', value: 'ARS' },
                                            { label: 'Dólar', value: 'USD' },
                                        ],
                                        BR: [
                                            { label: 'Real', value: 'BRL' },
                                            { label: 'Dólar', value: 'USD' },
                                        ],
                                        CL: [{ label: 'Peso Chileno', value: 'CLP' }],
                                    },
                                },
                            },
                            {
                                type: 'switch',
                                label: 'Cuenta principal',
                                name: 'principal',
                                gridCols: 4,
                            },
                            {
                                type: 'file',
                                label: 'Comprobante (no se renderiza dentro de items)',
                                name: 'comprobante',
                                gridCols: 12,
                            },
                        ],
                    },
                ],
            },
        ],
    };

    columnDefs: ColDef[] = [
        { headerName: 'ID', field: 'id', width: 80, sortable: true, filter: 'agNumberColumnFilter' },
        { headerName: 'Nombre', field: 'nombre', width: 150, sortable: true, filter: true },
        { headerName: 'Apellido', field: 'apellido', width: 150, sortable: true, filter: true },
        { headerName: 'Email', field: 'email', width: 200, sortable: true, filter: true },
        { headerName: 'País (Code)', field: 'country', width: 120, sortable: true, filter: true },
        {
            headerName: 'Activo',
            field: 'activo',
            width: 100,
            sortable: true,
            cellRenderer: (params: any) => {
                const isActive = params.value;
                return `<mat-chip class="${isActive ? 'chip-active' : 'chip-inactive'}" >
                            ${isActive ? 'Activo' : 'Inactivo'}
                        </mat-chip>`;
            }
        }
    ];

    // URL Configuration
    createUrl = 'http://localhost:3000/personas';
    deleteUrlBuilder = (data: any) => `http://localhost:3000/personas/${data.id}`;
    updateUrlBuilder = (data: any) => `http://localhost:3000/personas/${data.id}`;
}
