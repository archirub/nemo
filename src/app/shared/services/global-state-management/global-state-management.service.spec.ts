import { TestBed } from "@angular/core/testing";

import { GlobalStateManagementService } from "./global-state-management.service";

describe("InitService", () => {
  let service: GlobalStateManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalStateManagementService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
