import { TestBed } from "@angular/core/testing";

import { ChatboardPicturesStore } from "./chatboard-pictures.service";

describe("ChatboardPicturesStore", () => {
  let service: ChatboardPicturesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatboardPicturesStore);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
