import { TestBed } from '@angular/core/testing';

import { OtherProfilesStoreService } from './other-profiles-store.service';

describe('OtherProfilesStoreService', () => {
  let service: OtherProfilesStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OtherProfilesStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
