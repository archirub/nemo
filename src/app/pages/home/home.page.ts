import { Component, OnInit, Input } from "@angular/core";

import { FakeDataService } from "../../shared/services/fake-data.service";
import { Profile } from "../../shared/interfaces/profile.model";
import { Router } from "@angular/router";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit {
  testProfiles: Profile[];
  textSample: string;

  constructor(private fakeData: FakeDataService, private router: Router) {
    this.textSample = this.fakeData.generateSentence();
    this.testProfiles = this.fakeData.generateProfiles(10);
  }

  ngOnInit() {}
}
