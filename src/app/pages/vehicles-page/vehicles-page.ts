import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudManagerComponent, FormConfig } from '@dynamic-forms-lib';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-vehicles-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CrudManagerComponent],
  templateUrl: './vehicles-page.html',
  styles: [`
    :host {
      display: block;
      padding: 20px;
    }
  `]
})
export class VehiclesPageComponent {
  formConfig: FormConfig = {
    layout: 'tabs',
    groups: [
      {
        label: 'General Information',
        type: 'tabs',
        fields: [
          {
            type: 'text',
            label: 'Brand',
            name: 'brand',
            gridCols: 6,
            validations: { required: true }
          },
          {
            type: 'text',
            label: 'Model',
            name: 'model',
            gridCols: 6,
            validations: { required: true }
          },
          {
            type: 'number',
            label: 'Year',
            name: 'year',
            gridCols: 4,
            validations: { required: true, min: 1900, max: 2026 }
          },
          {
            type: 'select',
            label: 'Type',
            name: 'type',
            gridCols: 4,
            options: [
              { label: 'Sedan', value: 'sedan' },
              { label: 'SUV', value: 'suv' },
              { label: 'Truck', value: 'truck' },
              { label: 'Motorcycle', value: 'motorcycle' }
            ]
          },
          {
            type: 'text',
            label: 'Color',
            name: 'color',
            gridCols: 4
          }
        ]
      },
      {
        label: 'Technical Details',
        type: 'tabs',
        fields: [
          {
            type: 'text',
            label: 'License Plate',
            name: 'plate',
            gridCols: 6,
            suffix: { icon: 'directions_car', isIcon: true }
          },
          {
            type: 'number',
            label: 'Mileage',
            name: 'mileage',
            gridCols: 6,
            suffix: { text: 'km', isIcon: false }
          },
          {
            type: 'switch',
            label: 'In Service',
            name: 'inService',
            gridCols: 12
          }
        ]
      }
    ]
  };

  columnDefs: ColDef[] = [
    { headerName: 'Brand', field: 'brand', sortable: true, filter: true },
    { headerName: 'Model', field: 'model', sortable: true, filter: true },
    { headerName: 'Year', field: 'year', width: 100, sortable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'Plate', field: 'plate', width: 120, sortable: true, filter: true },
    { 
      headerName: 'Status', 
      field: 'inService', 
      width: 120,
      cellRenderer: (params: any) => params.value ? '✅ Active' : '❌ Maintenance'
    }
  ];

  apiUrl = 'http://localhost:3000/vehicles';
  createUrl = 'http://localhost:3000/vehicles';
  updateUrlBuilder = (data: any) => `http://localhost:3000/vehicles/${data.id}`;
  deleteUrlBuilder = (data: any) => `http://localhost:3000/vehicles/${data.id}`;
}
