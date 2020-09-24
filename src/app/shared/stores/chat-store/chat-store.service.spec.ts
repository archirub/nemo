import { TestBed } from '@angular/core/testing';

import { ChatStoreService } from './chat-store.service';

describe('ChatStoreService', () => {
  let service: ChatStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
