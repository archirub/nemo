import { TestBed } from '@angular/core/testing';

import { OwnPicturesService } from './own-pictures.service';

describe('OwnPicturesService', () => {
  let service: OwnPicturesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OwnPicturesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
