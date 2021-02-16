import { TestBed } from '@angular/core/testing';

import { SignupAuthGuard } from './signup-auth.guard';

describe('SignupAuthGuard', () => {
  let guard: SignupAuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(SignupAuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
