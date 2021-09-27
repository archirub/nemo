import { TestBed } from '@angular/core/testing';

import { PageReadinessService } from './page-readiness.service';

describe('PageReadinessService', () => {
  let service: PageReadinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PageReadinessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
