import { Component, ElementRef, ViewChild } from "@angular/core";
import { Animation } from "@ionic/angular";

import { BehaviorSubject } from "rxjs";
import { map } from "rxjs/operators";

import { ChatBoardComponent } from "./chat-board/chat-board.component";

import { ChatboardStore } from "@stores/index";

import { Chat } from "@classes/index";
import { FishSwimAnimation } from "@animations/fish.animation";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage {
  TOP_SCROLL_SPEED = 100;
  fishSwimAnimation: Animation;

  @ViewChild("chatboard") chatboard: ChatBoardComponent;
  @ViewChild("fish", { read: ElementRef }) fish: ElementRef;

  showLoading$ = new BehaviorSubject<boolean>(true);

  get chats$() {
    return this.chatboardStore.chats$.pipe(
      map((chatsObject) => this.sortChats(chatsObject))
    );
  }

  get matches$() {
    return this.chatboardStore.matches$.pipe(
      map((chatsObject) => this.sortChats(chatsObject))
    );
  }

  get numberOfChats$() {
    return this.chats$.pipe(map((chats) => chats.length));
  }

  constructor(private chatboardStore: ChatboardStore) {}

  ngAfterViewInit() {
    this.fishSwimAnimation = FishSwimAnimation(this.fish);
    this.fishSwimAnimation.play();
  }

  onCharboardReady() {
    this.showLoading$.next(false);
    this.stopLoadingAnimation();
  }

  stopLoadingAnimation() {
    this.fishSwimAnimation?.destroy();
  }

  private sortChats(chats: { [chatID: string]: Chat }): Chat[] {
    return Object.values(chats).sort(
      (chat1, chat2) =>
        chat2?.recentMessage?.time?.getTime() - chat1?.recentMessage?.time?.getTime()
    );
  }
}
