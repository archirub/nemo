import { TestBed } from "@angular/core/testing";

import { UserProfileStore } from "./user-profile-store.service";

describe("UserProfileStore", () => {
  let service: UserProfileStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserProfileStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
