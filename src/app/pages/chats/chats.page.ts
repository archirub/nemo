import { Component, OnInit } from "@angular/core";
import { Profile } from "src/app/profile.model";
import { FakeDataService } from "src/app/services/fake-data.service";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit {
  testProfiles: Profile[];
  textSample: string;

  constructor(private fakeData: FakeDataService) {}

  ngOnInit() {
    this.textSample = this.fakeData.generateSentence();
    this.testProfiles = this.fakeData.generateProfiles(10);
  }
}
