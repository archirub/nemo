import { Component, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { IonContent } from "@ionic/angular";
import {
  AngularFirestore,
  DocumentChangeAction,
} from "@angular/fire/firestore";

import { Observable, Subscription } from "rxjs";
import { map, take } from "rxjs/operators";

import { ChatStore } from "@stores/index";
import { Chat, Profile } from "@classes/index";
import { AuthService } from "@services/index";
import { chatFromDatabase } from "@interfaces/index";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) ionContent: IonContent;

  TOP_SCROLL_SPEED = 100;

  private chats$: Subscription;
  public chats: Observable<Chat[]>;

  constructor(private chatStore: ChatStore) {}

  ngOnInit() {
    this.chats = this.chatStore.chats;
  }

  scrollToTop() {
    this.ionContent.scrollToTop(this.TOP_SCROLL_SPEED);
  }

  ngOnDestroy() {
    this.chats$.unsubscribe();
  }
}
