import { TestBed } from '@angular/core/testing';

import { SwipeStackStoreService } from './swipe-stack-store.service';

describe('SwipeStackStoreService', () => {
  let service: SwipeStackStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SwipeStackStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
