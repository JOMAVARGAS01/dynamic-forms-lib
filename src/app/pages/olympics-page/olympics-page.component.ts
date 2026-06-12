import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudManagerComponent, FormConfig } from '@dynamic-forms-lib';
import { ColDef } from 'ag-grid-community';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-olympics-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CrudManagerComponent, MatFormFieldModule, MatSelectModule, FormsModule],
  templateUrl: './olympics-page.component.html',
  styleUrls: ['./olympics-page.component.css']
})
export class OlympicsPageComponent {
  selectedYear = 2000;
  apiUrl = signal('http://localhost:3001/medals?year=2000');

  onYearChange() {
    this.apiUrl.set(`http://localhost:3001/medals?year=${this.selectedYear}`);
  }

  formConfig: FormConfig = {
    layout: 'tabs',
    groups: [
      {
        label: 'Medal Info',
        type: 'tabs',
        fields: [
          { type: 'text', label: 'Country', name: 'country', gridCols: 6, validations: { required: true } },
          { type: 'number', label: 'Gold', name: 'gold', gridCols: 2 },
          { type: 'number', label: 'Silver', name: 'silver', gridCols: 2 },
          { type: 'number', label: 'Bronze', name: 'bronze', gridCols: 2 },
          { type: 'number', label: 'Year', name: 'year', gridCols: 12, validations: { required: true } },
        ]
      }
    ]
  };

  columnDefs: ColDef[] = [
    { headerName: 'Country', field: 'country', sortable: true, filter: true },
    { headerName: 'Gold', field: 'gold', sortable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'Silver', field: 'silver', sortable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'Bronze', field: 'bronze', sortable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'Year', field: 'year', sortable: true, filter: true }
  ];

  // URL Configuration
  createUrl = 'http://localhost:3001/medals';
  deleteUrlBuilder = (data: any) => `http://localhost:3001/medals/${data.id || 0}`; // Mock ID handling if not present
  updateUrlBuilder = (data: any) => `http://localhost:3001/medals/${data.id || 0}`;
}
