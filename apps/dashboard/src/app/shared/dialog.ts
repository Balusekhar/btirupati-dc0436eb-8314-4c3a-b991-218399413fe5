import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * Reusable modal dialog shell.
 * Usage:
 *   <app-dialog [open]="isOpen()" (closed)="close()">
 *     <span dialog-title>My Title</span>
 *     <div dialog-body>…content…</div>
 *     <div dialog-footer>…actions…</div>
 *   </app-dialog>
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm d-flex flex-items-center flex-justify-center p-2 sm:p-4"
        (click)="onBackdropClick($event)"
        (keydown.escape)="closed.emit()"
      >
        <!-- Panel -->
        <div
          class="dialog-panel bg-white shadow-2xl w-full overflow-hidden animate-in rounded-xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] d-flex flex-column"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div class="d-flex flex-items-center flex-justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
            <h2 class="text-sm sm:text-base font-bold text-gray-900 m-0">
              <ng-content select="[dialog-title]"></ng-content>
            </h2>
            <button
              class="rounded-md p-1.5 text-gray-400 transition hover:text-gray-600 hover:bg-gray-100 -mr-1"
              type="button"
              (click)="closed.emit()"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Body (scrollable) -->
          <div class="px-4 sm:px-5 py-3 sm:py-4 overflow-y-auto flex-1">
            <ng-content select="[dialog-body]"></ng-content>
          </div>

          <!-- Footer -->
          <div class="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/50 d-flex flex-items-center flex-justify-end gap-2 flex-shrink-0">
            <ng-content select="[dialog-footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .dialog-panel {
        max-width: 540px;
      }
      .animate-in {
        animation: dialogIn 0.15s ease-out;
      }
      @keyframes dialogIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(8px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      /* On very small screens, make dialog nearly full-width */
      @media (max-width: 480px) {
        .dialog-panel {
          max-width: 100%;
          border-radius: 0.75rem;
        }
      }
    `,
  ],
})
export class DialogComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    // Only close if they clicked the backdrop itself, not the panel
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
