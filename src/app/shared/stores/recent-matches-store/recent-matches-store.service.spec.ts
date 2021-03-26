import { TestBed } from '@angular/core/testing';

import { RecentMatchesStoreService } from './recent-matches-store.service';

describe('RecentMatchesStoreService', () => {
  let service: RecentMatchesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecentMatchesStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
