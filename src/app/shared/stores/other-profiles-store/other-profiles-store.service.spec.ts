import { TestBed } from "@angular/core/testing";

import { OtherProfilesStore } from "./other-profiles-store.service";

describe("OtherProfilesStore", () => {
  let service: OtherProfilesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OtherProfilesStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
