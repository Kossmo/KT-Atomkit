import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { DeviceService } from './core/device.service';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => {
      const device = inject(DeviceService);
      return device.isMobile()
        ? import('./mobile/mobile-lab.component').then(m => m.MobileLabComponent)
        : import('./ui/lab/lab.component').then(m => m.LabComponent);
    },
  },
];
