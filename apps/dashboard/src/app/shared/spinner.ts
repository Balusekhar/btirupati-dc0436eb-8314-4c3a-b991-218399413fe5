import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="spinner" [class.spinner-sm]="size === 'sm'" [class.spinner-lg]="size === 'lg'" role="status">
      <span class="sr-only">Loading…</span>
    </span>
  `,
  styles: [
    `
      .spinner {
        display: inline-block;
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        vertical-align: middle;
      }
      .spinner-sm {
        width: 0.875rem;
        height: 0.875rem;
        border-width: 2px;
      }
      .spinner-lg {
        width: 2rem;
        height: 2rem;
        border-width: 3px;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class Spinner {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
