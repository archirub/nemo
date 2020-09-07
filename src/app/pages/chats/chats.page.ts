import { Component, OnInit } from "@angular/core";
import { Profile } from "@interfaces/";
import { FakeDataService } from "@services/";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit {
  testProfiles: Profile[];

  constructor(private fakeData: FakeDataService) {}

  ngOnInit() {
    this.testProfiles = this.fakeData.generateProfiles(20);
  }
}
