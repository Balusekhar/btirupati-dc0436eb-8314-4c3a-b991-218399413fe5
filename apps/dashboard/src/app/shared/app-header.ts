import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { TokenStorageService } from '../core/auth/token-storage.service';

@Component({
  selector: 'app-app-header',
  imports: [RouterModule],
  templateUrl: './app-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  private readonly auth = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);

  readonly isAuthenticated = this.tokenStorage.isAuthenticated;

  logout(): void {
    this.auth.logout();
  }
}
