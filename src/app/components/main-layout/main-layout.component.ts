import { Component, inject, ViewChild, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SidebarService } from '@dynamic-forms-lib';
import { ThemeSettingsComponent } from '../theme-settings/theme-settings.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    ThemeSettingsComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {
  @ViewChild('drawer') drawer!: MatSidenav;

  drawerOpened!: boolean;
  private breakpointObserver = inject(BreakpointObserver);
  private sidebarService = inject(SidebarService);


  // Convert observables to signals using toSignal()
  isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(map(result => result.matches)),
    { initialValue: false }
  );

  constructor() {
    this.drawerOpened = !this.isHandset();
    // Use effect to react to sidebar signal changes
    effect(() => {
      const isOpen = this.sidebarService.sidebarOpen();
      this.drawerOpened = isOpen; 
    });
  }

  onMenuClick(drawer: any) {
    // Close drawer on mobile after clicking a menu item
    if (this.isHandset()) {
      drawer.close();
    }
  }
}
