import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TokenStorageService } from '../../core/auth/token-storage.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  private readonly tokenStorage = inject(TokenStorageService);
  readonly isAuthenticated = this.tokenStorage.isAuthenticated;
}
