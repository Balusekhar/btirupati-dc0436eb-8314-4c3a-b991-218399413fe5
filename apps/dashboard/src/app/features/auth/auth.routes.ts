import { Route } from '@angular/router';
import { LoginPage } from './login-page';
import { SignupPage } from './signup-page';

export const AUTH_ROUTES: Route[] = [
  {
    path: '',
    component: LoginPage,
  },
  {
    path: 'signup',
    component: SignupPage,
  },
];

