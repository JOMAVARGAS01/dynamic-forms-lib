import { InjectionToken, Signal, signal } from '@angular/core';

export interface DynamicFormsTranslations {
  crud: {
    add: string;
    export: string;
    search: string;
    actions: string;
    columnsVisibility: string;
    confirmDelete: string;
    deleteSuccess: string;
    deleteError: string;
    addSuccess: string;
    addError: string;
    updateSuccess: string;
    updateError: string;
    missingDataError: string;
    missingUrlError: string;
    missingUpdateUrlError: string;
  };
  form: {
    save: string;
    cancel: string;
    back: string;
    next: string;
    invalidForm: string;
    invalidFields: string;
  };
  dialog: {
    confirmation: string;
    cancel: string;
    accept: string;
  };
  field: {
    required: string;
    invalidEmail: string;
    minLength: string;
    invalidFormat: string;
    minValue: string;
    maxValue: string;
    invalidData: string;
  };
  actionCell: {
    edit: string;
    delete: string;
  };
  formArray: {
    addItem: string;
    removeItem: string;
    itemTitle: string;
    minItemsError: string;
    confirmRemoveItem: string;
  };
  snackbar: {
    close: string;
  };
  fileArray: {
    addFiles: string;
    maxFilesError: string;
    removeFile: string;
    uploading: string;
  };
  quickAdd: {
    title: string;
    add: string;
  };
}

export const DEFAULT_TRANSLATIONS: DynamicFormsTranslations = {
  crud: {
    add: 'Nuevo',
    export: 'Exportar',
    search: 'Buscar...',
    actions: 'Acciones',
    columnsVisibility: 'Columnas visibles',
    confirmDelete: '¿Está seguro de que desea eliminar este registro?',
    deleteSuccess: '✅ Registro eliminado con éxito.',
    deleteError: '❌ Error al eliminar el registro.',
    addSuccess: '✅ Registro agregado con éxito.',
    addError: '❌ Error al agregar registro.',
    updateSuccess: '✅ Registro actualizado con éxito.',
    updateError: '❌ Error al actualizar registro.',
    missingDataError: '⚠️ Error: No se encontraron datos para eliminar.',
    missingUrlError: '⚠️ Error: No se puede determinar la URL de eliminación (falta ID o configuración custom).',
    missingUpdateUrlError: '⚠️ Error: No se puede determinar la URL de actualización.',
  },
  form: {
    save: 'Guardar Cambios',
    cancel: 'Cancelar',
    back: 'Volver',
    next: 'Siguiente',
    invalidForm: 'Formulario inválido. Por favor, revise los campos marcados.',
    invalidFields: 'Campos inválidos:',
  },
  dialog: {
    confirmation: 'Confirmación',
    cancel: 'Cancelar',
    accept: 'Aceptar',
  },
  field: {
    required: 'Este campo es requerido.',
    invalidEmail: 'Email inválido.',
    minLength: 'Mínimo {length} caracteres.',
    invalidFormat: 'El formato ingresado no es válido.',
    minValue: 'El valor mínimo es {min}.',
    maxValue: 'El valor máximo es {max}.',
    invalidData: 'Dato inválido.',
  },
  actionCell: {
    edit: 'Editar Registro',
    delete: 'Eliminar Registro',
  },
  formArray: {
    addItem: 'Agregar',
    removeItem: 'Eliminar',
    itemTitle: 'Elemento {{index}}',
    minItemsError: 'Mínimo {min} elemento(s) requerido(s).',
    confirmRemoveItem: '¿Está seguro de que desea eliminar este elemento?',
  },
  snackbar: {
    close: 'Cerrar',
  },
  fileArray: {
    addFiles: 'Agregar archivos',
    maxFilesError: 'Se alcanzó el máximo de archivos permitidos ({max}).',
    removeFile: 'Eliminar archivo',
    uploading: 'Subiendo...',
  },
  quickAdd: {
    title: 'Agregar nuevo registro',
    add: 'Agregar',
  },
};

export const DYNAMIC_FORMS_TRANSLATIONS = new InjectionToken<Signal<DynamicFormsTranslations>>(
  'DynamicFormsTranslations',
  { providedIn: 'root', factory: () => signal(DEFAULT_TRANSLATIONS) }
);

export function provideDynamicFormsTranslations(translations: DynamicFormsTranslations) {
  return {
    provide: DYNAMIC_FORMS_TRANSLATIONS,
    useValue: signal(translations),
  };
}
