import { TestBed } from "@angular/core/testing";

import { SearchCriteriaStore } from "./search-criteria-store.service";

describe("SearchCriteriaStore", () => {
  let service: SearchCriteriaStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchCriteriaStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
