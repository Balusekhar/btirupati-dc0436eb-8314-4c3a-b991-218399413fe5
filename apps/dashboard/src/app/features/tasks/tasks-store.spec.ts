import { TestBed } from '@angular/core/testing';

import { TasksStore } from './tasks-store';

describe('TasksStore', () => {
  let service: TasksStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TasksStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
