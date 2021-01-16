import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";

import { Chat } from "@classes/index";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent {
  @Input() chats: Chat[];

  constructor(private router: Router) {}

  ngOnInit() {
    //this.ActivatedRoute.paramMap.subscribe();
    //this.displayedText = this.fakeData.generateSentences(this.profiles.length);
    // this.chats[0].messages[6].
  }

  shorten(sentence: string) {
    if (sentence.length > 25) {
      let shortenedSentence = sentence.slice(0, 25);
      if (shortenedSentence.endsWith(" " || ".")) {
        shortenedSentence = sentence.slice(0, 24);
      }
      return shortenedSentence + "...";
    }
  }

  getDate(date: Date) {
    let month = date.getMonth();
    let day = date.getDay();
    return day.toString() + "/" + month.toString;
  }

  calcUnread(chat: Chat) {
    let counter = 0;
    for (let msg of chat.messages) {
      if (msg.senderID == chat.recipient.uid && msg.seen !== true) {
        counter++;
      }
    }
    return counter;
  }

  goToMessenger(chatID: String) {
    this.router.navigate(["/messenger/" + chatID]);
  }
}
