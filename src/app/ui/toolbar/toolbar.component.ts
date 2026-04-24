import { Component, inject, output } from '@angular/core';
import { AppStateStore } from '../../store/app-state.store';
import { WorkspaceService } from '../../workspace/workspace.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
})
export class ToolbarComponent {
  readonly store = inject(AppStateStore);
  readonly #ws = inject(WorkspaceService);

  readonly scanRequested = output<void>();

  clearScene(): void { this.#ws.clearScene(); }
}
