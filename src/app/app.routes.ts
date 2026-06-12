import { Routes } from '@angular/router';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/welcome-page/welcome-page.component').then(m => m.WelcomePageComponent)
      },
      {
        path: 'personas',
        loadComponent: () => import('./pages/personas-page/personas-page.component').then(m => m.PersonasPageComponent)
      },
      {
        path: 'pokemon',
        loadComponent: () => import('./pages/pokemon-page/pokemon-page.component').then(m => m.PokemonPageComponent)
      },
      {
        path: 'star-wars',
        loadComponent: () => import('./pages/star-wars-page/star-wars-page.component').then(m => m.StarWarsPageComponent)
      },
      {
        path: 'olympics',
        loadComponent: () => import('./pages/olympics-page/olympics-page.component').then(m => m.OlympicsPageComponent)
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./pages/vehicles-page/vehicles-page').then(m => m.VehiclesPageComponent)
      },
      {
        path: '**',
        redirectTo: '',
        pathMatch: 'full'
      }
    ]
  }
];

