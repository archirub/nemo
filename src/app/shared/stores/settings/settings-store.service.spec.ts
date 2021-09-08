import { TestBed } from "@angular/core/testing";

import { SettingsStore } from "./settings-store.service";

describe("SettingsStore", () => {
  let service: SettingsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
