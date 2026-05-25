import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { ApiConfig } from '../types/dynamic-form.types';

type Option = { label: string, value: any };

@Injectable({ providedIn: 'root' })
export class DynamicOptionsService {
  private http = inject(HttpClient);

  fetchOptions(config: ApiConfig, dependentValue?: any): Observable<Option[]> {
    let params = new HttpParams();
    
    if (config.dependsOn && config.queryParam && dependentValue) {
      params = params.set(config.queryParam, dependentValue);
    } else if (config.dependsOn && !dependentValue) {
      return of([]);
    }

    return this.http.get<any>(config.endpoint, { params }).pipe(
      map(response => {
        const list: any[] = Array.isArray(response) ? response : (response as any).data || [];
        let options: Option[] = [];
        const isOneToMany = config.valueKey?.includes('.*') || config.labelKey?.includes('.*');

        if (isOneToMany) {
            options = this.handleOneToManyMapping(list, config);
        } else {
            options = list.map((item: any) => ({
                value: this.resolveProperty(item, config.valueKey || 'id'),
                label: this.resolveProperty(item, config.labelKey || 'name')
            }));
        }

        const finalOptions = options
            .filter(option => option.value !== null && option.label !== null)
            .sort((a: Option, b: Option) => String(a.label || '').localeCompare(String(b.label || '')));
        
        return finalOptions;
      })
    );
  }

  private handleOneToManyMapping(list: any[], config: ApiConfig): Option[] {
    const valuePath = config.valueKey || '';
    const labelPath = config.labelKey || '';
    const iterateOnPath = valuePath.split('.*')[0] || labelPath.split('.*')[0];
    if (!iterateOnPath) return [];
    const labelPropertyPostWildcard = labelPath.includes('.*') ? labelPath.split('.*')[1] : '';

    return list.flatMap((item: any) => {
      const iterateObject = this.resolveProperty(item, iterateOnPath);
      if (!iterateObject || typeof iterateObject !== 'object') return [];
      return Object.keys(iterateObject).map(key => {
        const details = iterateObject[key];
        return {
          value: key,
          label: this.resolveProperty(details, labelPropertyPostWildcard.substring(1)) || key
        };
      });
    });
  }

  private resolveProperty(obj: any, path: string): any {
    if (!path) return obj;
    return path.split('.').reduce((prev, curr) => {
      if (prev === null || prev === undefined) return null;
      if (curr === '*') {
        const keys = Object.keys(prev);
        return keys.length > 0 ? prev[keys[0]] : null;
      }
      return prev[curr];
    }, obj);
  }
}
