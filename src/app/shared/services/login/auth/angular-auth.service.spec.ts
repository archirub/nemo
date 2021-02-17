import { TestBed } from '@angular/core/testing';

import { AngularAuthService } from './angular-auth.service';

describe('AngularAuthService', () => {
  let service: AngularAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AngularAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
