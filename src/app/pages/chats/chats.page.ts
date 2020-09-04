import { Component, OnInit } from "@angular/core";
import { Profile } from "src/app/shared/Interfaces/profile.model";
import { FakeDataService } from "../../shared/services/fake-data.service";

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
