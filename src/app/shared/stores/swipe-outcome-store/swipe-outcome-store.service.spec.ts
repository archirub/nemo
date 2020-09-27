import { TestBed } from "@angular/core/testing";

import { SwipeOutcomeStore } from "./swipe-outcome-store.service";

describe("SwipeOutcomeStore", () => {
  let service: SwipeOutcomeStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SwipeOutcomeStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
