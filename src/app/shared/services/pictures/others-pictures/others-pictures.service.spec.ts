import { TestBed } from '@angular/core/testing';

import { OthersPicturesService } from './others-pictures.service';

describe('OthersPicturesService', () => {
  let service: OthersPicturesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OthersPicturesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
