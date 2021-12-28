import { TestBed } from '@angular/core/testing';

import { TutorialsService } from './tutorials.service';

describe('TutorialsService', () => {
  let service: TutorialsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutorialsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
