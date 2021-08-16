import { chat } from "./../../shared/interfaces/chat.model";
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";

import { combineLatest, Observable, Subscription } from "rxjs";

import { ChatboardStore, SwipeStackStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { ChatBoardComponent } from "./chat-board/chat-board.component";
import { Router } from "@angular/router";
import { map, tap } from "rxjs/operators";
import { FishSwimAnimation } from "@animations/fish.animation";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage {
  @ViewChild("chatboard") chatboard: ChatBoardComponent;
  @ViewChild('fish', { read: ElementRef }) fish: ElementRef;

  fishSwimAnimation;

  TOP_SCROLL_SPEED = 100;

  numberOfChats$: Observable<number>;
  chats$: Observable<Chat[]>;
  matches$: Observable<Chat[]>;

  constructor(private router: Router, private chatboardStore: ChatboardStore) {
    this.chats$ = this.chatboardStore.chats$.pipe(
      map((chatsObject) => this.sortChats(chatsObject))
    );

    this.matches$ = this.chatboardStore.matches$.pipe(
      map((chatsObject) => this.sortChats(chatsObject))
    );

    this.numberOfChats$ = this.chats$.pipe(map((chats) => chats.length));
  }

  ngAfterViewInit() {
    this.fishSwimAnimation = FishSwimAnimation(this.fish);

    this.fishSwimAnimation.play();
  }

  stopAnimation() {
    this.fishSwimAnimation.destroy();
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
