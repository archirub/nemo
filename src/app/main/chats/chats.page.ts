import { Component, OnInit, ViewChild } from "@angular/core";

import { Observable } from "rxjs";

import { ChatboardStore, SwipeStackStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { ChatBoardComponent } from "./chat-board/chat-board.component";
import { Router } from "@angular/router";
import { map } from "rxjs/operators";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit {
  @ViewChild("chatboard") chatboard: ChatBoardComponent;

  TOP_SCROLL_SPEED = 100;

  chatNumber: number;

  public chats: Observable<Chat[]>;
  public matches: Chat[];

  constructor(private router: Router, private chatboardStore: ChatboardStore) {}

  ngOnInit() {
    this.chatboardStore.activateStore().subscribe();
    this.chatboardStore.chats$.subscribe(console.log);

    this.chats = this.chatboardStore.chats$.pipe(map((c) => this.sortChats(c)));

    this.chats.forEach((c) => {
      this.chatNumber = c.length;
    });

    this.buildMatches();
  }

  buildMatches() {
    this.matches = [];

    this.chats.forEach((c) => {
      c.forEach((chat) => {
        this.matches.push(chat);
      });
    });
  }

  scrollToTop() {
    this.chatboard.scroll(this.TOP_SCROLL_SPEED);
  }

  goToCatch() {
    this.router.navigateByUrl("/main/tabs/home");
  }

  private sortChats(chats: { [chatID: string]: Chat }): Chat[] {
    return Object.values(chats).sort(
      (chat1, chat2) =>
        chat2?.recentMessage?.time?.getTime() - chat1?.recentMessage?.time?.getTime()
    );
  }
}
