import { TestBed } from "@angular/core/testing";

import { CurrentUserStore } from "./current-user-store.service";

describe("CurrentUserStoreService", () => {
  let service: CurrentUserStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentUserStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
