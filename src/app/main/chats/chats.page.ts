import { Component, OnInit, ViewChild } from "@angular/core";

import { Observable } from "rxjs";

import { ChatStore, SwipeStackStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { ChatBoardComponent } from "./chat-board/chat-board.component";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit {
  @ViewChild("chatboard") chatboard: ChatBoardComponent;

  TOP_SCROLL_SPEED = 100;

  public chats: Observable<Chat[]>;
  public chatProfiles: Observable<Profile[]>;

  constructor(private swipeStackStore: SwipeStackStore, private chatStore: ChatStore) {}

  ngOnInit() {
    this.chats = this.chatStore.chats$;
    this.chatProfiles = this.swipeStackStore.profiles$;
  }

  scrollToTop() {
    this.chatboard.scroll(this.TOP_SCROLL_SPEED);
  }
}
