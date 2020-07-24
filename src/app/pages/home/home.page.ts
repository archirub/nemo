import { Component, OnInit, Input } from "@angular/core";

import { FakeDataService } from "../../services/fake-data.service";
import { Profile } from "../../profile.model";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit {
  testProfiles: Profile[];
  textSample: string;

  constructor(private fakeData: FakeDataService) {}

  ngOnInit() {
    this.textSample = this.fakeData.generateSentence();
    this.testProfiles = this.fakeData.generateProfiles(10);
  }
}
