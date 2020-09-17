import { TestBed } from '@angular/core/testing';

import { UserProfileStoreService } from './user-profile-store.service';

describe('UserProfileStoreService', () => {
  let service: UserProfileStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserProfileStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
