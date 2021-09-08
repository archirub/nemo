import { TestBed } from "@angular/core/testing";

import { OwnPicturesStore } from "./own-pictures.service";

describe("OwnPicturesService", () => {
  let service: OwnPicturesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OwnPicturesStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
