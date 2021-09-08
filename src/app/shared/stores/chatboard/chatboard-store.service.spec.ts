import { TestBed } from "@angular/core/testing";

import { ChatboardStore } from "./chatboard-store.service";

describe("ChatboardStoreService", () => {
  let service: ChatboardStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatboardStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
