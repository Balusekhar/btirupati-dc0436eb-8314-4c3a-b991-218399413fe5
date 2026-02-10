import { TestBed } from '@angular/core/testing';

import { TasksApi } from './tasks-api';

describe('TasksApi', () => {
  let service: TasksApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TasksApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
