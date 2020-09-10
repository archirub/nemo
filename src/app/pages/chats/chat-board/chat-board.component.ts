import { Component, OnInit, Input } from "@angular/core";
import { ActivatedRoute, Router } from '@angular/router';

import { Profile } from "../../../shared/interfaces/profile/profile.class"
import { FakeDataService } from "../../../shared/services/fake-data/fake-data.service";
import { relative } from 'path';

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
  @Input() profiles: Profile[];
  displayedProfiles: Profile[];
  displayedText: string[];
  profileId: string;

  constructor(private fakeData: FakeDataService, private router: Router) {}

  ngOnInit() {
    //this.router.paramMap.subscribe();
    this.displayedProfiles = this.profiles;
    this.displayedText = this.fakeData.generateSentences(this.profiles.length);
  }

  displayText(sentence:string) {
    if(sentence.length > 25) {
      let shortenedSentence = sentence.slice(0,25);
      if (shortenedSentence.endsWith(" " || ".")) {
        shortenedSentence = sentence.slice(0,24);
      }
      return shortenedSentence + "...";
    }
  }
  
  goToMessenger(profileId: String) {
    //this.profileId = profile.id;
    console.log(profileId);
    //this.router.navigate(['messenger/' + profileId]);
    this.router.navigate(['./'+ profileId]);
    //this.router.navigate(['./messenger', 33, 'user', 11], {relativeTo: route});
  }
}
