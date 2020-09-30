import { Component, OnInit, Input } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { Chat } from "@classes/index";
import { FakeDataService } from "@services/fake-data/fake-data.service";
import { relative } from "path";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
  @Input() chats: Chat[];
  displayedText: string[];
  chatID: string;

  constructor(
    private fakeData: FakeDataService,
    private ActivatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    //this.ActivatedRoute.paramMap.subscribe();
    //this.displayedText = this.fakeData.generateSentences(this.profiles.length);
  }

  // displayText(sentence: string) {
  //   if (sentence.length > 25) {
  //     let shortenedSentence = sentence.slice(0, 25);
  //     if (shortenedSentence.endsWith(" " || ".")) {
  //       shortenedSentence = sentence.slice(0, 24);
  //     }
  //     return shortenedSentence + "...";
  //   }
  // }

  goToMessenger(chatID: String) {
    this.router.navigate(["/messenger/" + chatID]);
  }
}
