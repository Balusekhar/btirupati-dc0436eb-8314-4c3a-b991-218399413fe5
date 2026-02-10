import { Route } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { TasksPage } from './tasks-page';

export const TASKS_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [authGuard],
    component: TasksPage,
  },
];

