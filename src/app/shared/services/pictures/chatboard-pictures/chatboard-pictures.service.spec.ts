import { TestBed } from '@angular/core/testing';

import { ChatboardPicturesService } from './chatboard-pictures.service';

describe('ChatboardPicturesService', () => {
  let service: ChatboardPicturesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatboardPicturesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
