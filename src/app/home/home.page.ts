import { Component, OnInit } from "@angular/core";
import { FakeDataService } from "../fake-data.service";
import { Profile } from "../profile.model";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit {
  private faker = require("faker");

  testProfiles: Profile[];
  private textSample: string;

  constructor(private fakeData: FakeDataService) {}

  ngOnInit() {
    this.textSample = this.fakeData.generateSentence();
    this.testProfiles = this.fakeData.generateProfiles(10);
    console.log(this.testProfiles);
  }
}
