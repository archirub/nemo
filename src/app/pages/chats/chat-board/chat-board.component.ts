import { Component, OnInit, Input, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { Chat } from "@classes/index";
import { FakeDataService } from "@services/fake-data/fake-data.service";
import { ChatStore } from "@stores/index";
import { Subscription } from "rxjs";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit, OnDestroy {
  @Input() chats: Chat[];
  chats$: Subscription;
  chats_: Chat[];

  constructor(
    private fakeData: FakeDataService,
    private ActivatedRoute: ActivatedRoute,
    private router: Router,
    private chatStore: ChatStore
  ) {}

  ngOnInit() {
    this.chats$ = this.chatStore.chats.subscribe((chats) => {
      this.chats_ = chats;
      console.log(chats.map((chat) => chat.recipient));
    });

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

  ngOnDestroy() {
    this.chats$.unsubscribe();
  }
}
