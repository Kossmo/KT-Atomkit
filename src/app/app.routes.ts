import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./ui/lab/lab.component').then(m => m.LabComponent),
  },
];
