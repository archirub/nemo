import { TestBed } from "@angular/core/testing";

import { SwipeStackStore } from "./swipe-stack-store.service";

describe("SwipeStackStore", () => {
  let service: SwipeStackStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SwipeStackStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
