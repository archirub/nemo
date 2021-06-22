import { TestBed } from '@angular/core/testing';

import { StackPicturesService } from './stack-pictures.service';

describe('StackPicturesService', () => {
  let service: StackPicturesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StackPicturesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
