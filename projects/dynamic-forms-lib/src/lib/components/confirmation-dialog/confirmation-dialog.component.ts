import { Component, inject, ChangeDetectionStrategy, Optional, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { DYNAMIC_FORMS_TRANSLATIONS, DynamicFormsTranslations, DEFAULT_TRANSLATIONS } from '../../types/translations';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-confirmation-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.css']
})
/** Simple Material Dialog confirmation component. Displays a message with Confirm/Cancel buttons. */
export class ConfirmationDialogComponent {
    /** Dialog input data containing the confirmation message to display. */
    public data!: { message: string };

    private _translations = inject(DYNAMIC_FORMS_TRANSLATIONS, { optional: true });
    t = computed(() => this._translations?.() ?? DEFAULT_TRANSLATIONS);

    constructor() {
        this.data = inject(MAT_DIALOG_DATA);
    }
}
