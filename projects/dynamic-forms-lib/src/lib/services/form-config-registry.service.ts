import { Injectable } from '@angular/core';
import { FormConfig } from '../types/dynamic-form.types';

/**
 * Registry for mapping resource names to their full FormConfig.
 *
 * Pages register their FormConfigs in `ngOnInit`:
 * ```ts
 * registry.register('models', this.modelsFormConfig);
 * ```
 *
 * The QuickAddDialog checks this registry to show the full form
 * instead of the simple name-only dialog when a config is found.
 */
@Injectable({ providedIn: 'root' })
export class FormConfigRegistry {
  private configs = new Map<string, FormConfig | (() => FormConfig)>();

  register(name: string, config: FormConfig | (() => FormConfig)): void {
    this.configs.set(name, config);
  }

  get(name: string): FormConfig | undefined {
    const entry = this.configs.get(name);
    if (!entry) return undefined;
    return typeof entry === 'function' ? entry() : entry;
  }
}
