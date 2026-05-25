import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {
    private sidebarOpenSignal = signal<boolean>(true);
    public sidebarOpen = this.sidebarOpenSignal.asReadonly();

    setSidebarOpen(isOpen: boolean) {
        this.sidebarOpenSignal.set(isOpen);
    }

    closeSidebar() {
        this.sidebarOpenSignal.set(false);
    }
}
