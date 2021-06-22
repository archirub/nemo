import { Component, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { IonContent } from "@ionic/angular";
import { AngularFirestore, DocumentChangeAction } from "@angular/fire/firestore";

import { Observable, Subscription } from "rxjs";
import { map, take } from "rxjs/operators";

import { ChatStore, SwipeStackStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { chatFromDatabase } from "@interfaces/index";
import { ChatBoardComponent } from "./chat-board/chat-board.component";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit, OnDestroy {
  @ViewChild("chatboard") chatboard: ChatBoardComponent;

  TOP_SCROLL_SPEED = 100;

  // private chats$: Subscription;
  public chats: Observable<Chat[]>;
  public chatProfiles: Observable<Profile[]>;

  constructor(private swipeStackStore: SwipeStackStore, private chatStore: ChatStore) {}

  ngOnInit() {
    this.chats = this.chatStore.chats;
    this.chatProfiles = this.swipeStackStore.profiles$;
  }

  scrollToTop() {
    this.chatboard.scroll(this.TOP_SCROLL_SPEED);
  }

  ngOnDestroy() {
    // this.chats$.unsubscribe();
  }
}
