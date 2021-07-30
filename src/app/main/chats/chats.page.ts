import { Component, OnInit, ViewChild } from "@angular/core";

import { Observable } from "rxjs";

import { ChatStore, SwipeStackStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { ChatBoardComponent } from "./chat-board/chat-board.component";
import { Router } from "@angular/router";

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
  public chatProfiles: Observable<Profile[]>;
  public matches: Chat[];

  constructor(
    private swipeStackStore: SwipeStackStore,
    private router: Router,
    private chatStore: ChatStore
  ) {}

  ngOnInit() {
    this.chats = this.chatStore.chats$;
    this.chatProfiles = this.swipeStackStore.profiles$;

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
}
