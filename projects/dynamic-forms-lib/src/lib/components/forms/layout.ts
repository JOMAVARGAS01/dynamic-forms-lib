import { BaseField, FieldConfig, FormConfig, GroupConfig } from '../../types/dynamic-form.types';

/**
 * Normalización de layout de formularios dinámicos.
 *
 * El sistema de grid usa 12 columnas y cada campo declara `gridCols`
 * (span). El desorden visual ("2-1-3", huecos, filas incompletas) ocurre
 * cuando los `gridCols` de un grupo no cierran filas de 12. Esta utilidad
 * redistribuye los campos de cada grupo en filas que SÍ suman 12,
 * estirando el último campo de cada fila para llenar el hueco, sin tocar
 * los `gridCols` que el autor definió (solo el último de cada fila crece).
 *
 * Los campos `hidden` (rowVersion, internos) no participan del cálculo:
 * se conservan con `gridCols: 1` para no generar filas vacías en el grid.
 */

/**
 * Reagrupa los campos de un grupo en filas de 12 columnas.
 * Devuelve un array NUEVO de campos clonados; no muta el original.
 * - `hidden: true` → `gridCols: 1` (no ocupa fila visible).
 * - Campos sin `gridCols` válido → 12 (fila completa, comportamiento previo).
 * - Al cerrar cada fila, el último campo visible se estira para completar 12.
 */
export function normalizeGroupLayout(fields: FieldConfig[]): FieldConfig[] {
  const clones: FieldConfig[] = fields.map((f) => ({ ...f }));
  let rowSum = 0;
  let lastInRow = -1;

  const isHidden = (f: FieldConfig): boolean => 'hidden' in f && Boolean((f as BaseField).hidden);

  const closeRow = (): void => {
    if (lastInRow >= 0 && !isHidden(clones[lastInRow])) {
      const deficit = 12 - rowSum;
      if (deficit > 0) {
        const current = clones[lastInRow];
        const lastCols = current.gridCols && current.gridCols > 0 ? current.gridCols : 12;
        current.gridCols = lastCols + deficit;
      }
    }
    rowSum = 0;
    lastInRow = -1;
  };

  for (let i = 0; i < clones.length; i++) {
    const f = clones[i];
    if (isHidden(f)) {
      f.gridCols = 1;
      continue;
    }
    const cols = f.gridCols && f.gridCols > 0 ? f.gridCols : 12;
    if (rowSum > 0 && rowSum + cols > 12) {
      closeRow();
    }
    f.gridCols = cols;
    rowSum += cols;
    lastInRow = i;
  }
  closeRow();

  return clones;
}

/**
 * Aplica la normalización de layout a todos los grupos de un FormConfig.
 * Devuelve un FormConfig nuevo (clones); no muta el recibido.
 */
export function normalizeFormConfig(config: FormConfig): FormConfig {
  const groups: GroupConfig[] = config.groups.map((g) => ({
    ...g,
    fields: normalizeGroupLayout(g.fields),
  }));
  return { ...config, groups };
}
