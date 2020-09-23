import { TestBed } from '@angular/core/testing';

import { SettingsStoreService } from './settings-store.service';

describe('SettingsStoreService', () => {
  let service: SettingsStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
