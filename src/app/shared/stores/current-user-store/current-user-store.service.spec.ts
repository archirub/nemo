import { TestBed } from '@angular/core/testing';

import { CurrentUserStoreService } from './current-user-store.service';

describe('CurrentUserStoreService', () => {
  let service: CurrentUserStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentUserStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
