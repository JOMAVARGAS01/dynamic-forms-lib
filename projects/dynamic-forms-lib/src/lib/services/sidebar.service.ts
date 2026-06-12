import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
/** Root service managing sidebar open/close state via a reactive signal. */
export class SidebarService {
    private sidebarOpenSignal = signal<boolean>(true);
    /** Read-only signal reflecting the current sidebar open state. */
    public sidebarOpen = this.sidebarOpenSignal.asReadonly();

    /** Sets the sidebar open state. */
    setSidebarOpen(isOpen: boolean) {
        this.sidebarOpenSignal.set(isOpen);
    }

    /** Closes the sidebar. */
    closeSidebar() {
        this.sidebarOpenSignal.set(false);
    }
}
