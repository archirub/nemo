import { Component, OnInit, Input } from "@angular/core";

import { Profile } from "src/app/profile.model";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
  @Input() profiles: Profile[];
  displayedProfiles: Profile[];

  constructor() {}

  ngOnInit() {
    this.displayedProfiles = this.profiles;
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
