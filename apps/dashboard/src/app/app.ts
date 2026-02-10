import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppHeader } from './shared/app-header';

@Component({
  imports: [RouterModule, AppHeader],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected title = 'dashboard';
}
