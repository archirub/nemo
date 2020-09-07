import { TestBed } from '@angular/core/testing';

import { SwipeOutcomeStoreService } from './swipe-outcome-store.service';

describe('SwipeOutcomeStoreService', () => {
  let service: SwipeOutcomeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SwipeOutcomeStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
