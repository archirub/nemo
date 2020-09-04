import { Component, OnInit, Input } from "@angular/core";

import { Profile } from "../../../shared/interfaces/profile.model";
import { FakeDataService } from "../../../shared/services/fake-data.service";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
  @Input() profiles: Profile[];
  displayedProfiles: Profile[];
  displayedText: string[];

  constructor(private fakeData: FakeDataService) {}

  ngOnInit() {
    this.displayedProfiles = this.profiles;
    this.displayedText = this.fakeData.generateSentences(this.profiles.length);
  }

  onSearchChange($event) {
    const searchTerm = $event.srcElement.value;

    this.displayedProfiles = this.profiles.filter((currentProfiles) => {
      return (
        currentProfiles.firstName
          .toLowerCase()
          .indexOf(searchTerm.toLowerCase()) != -1
      );
    });
  }
}
