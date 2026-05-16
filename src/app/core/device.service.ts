import { Injectable, signal } from '@angular/core';

/**
 * Frozen at construction time on purpose — switching layouts mid-session
 * would throw away the workspace state (atoms, bonds, selection, physics).
 * A rotation or window resize won't flip the flag.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  readonly isMobile = signal(this.#detectMobile());

  #detectMobile(): boolean {
    if (typeof window === 'undefined') return false;
    // Coarse pointer = touchscreen primary input (excludes desktop with touch monitor)
    return window.matchMedia('(max-width: 768px) and (pointer: coarse)').matches;
  }
}
