import { Component, OnDestroy, OnInit } from "@angular/core";
import { NavController } from "@ionic/angular";
import { ActivatedRoute } from "@angular/router";
import { Keyboard } from "@ionic-native/keyboard/ngx";

import { BehaviorSubject, Subscription } from "rxjs";
import { map } from "rxjs/operators";
// import { AutosizeModule } from "ngx-autosize";

import { Chat } from "@classes/index";
import { ChatStore } from "@stores/chat-store/chat-store.service";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [Keyboard],
})
export class MessengerPage implements OnInit, OnDestroy {
  private chats$: Subscription;
  private chatID: string;

  public chat = new BehaviorSubject<Chat>(null);

  constructor(
    private keyboard: Keyboard,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private chatStore: ChatStore
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((parameter) => {
      if (!parameter.has("chatID")) {
        this.navCtrl.navigateBack("/tabs/chats");
        return;
      }
      this.chatID = parameter.get("chatID");

      this.chats$ = this.chatStore.chats
        .pipe(
          map((chats) => {
            chats.forEach((chat) => {
              if (chat.id === this.chatID) {
                this.chat.next(chat);
              }
            });
          })
        )
        .subscribe();
    });
  }

  ngOnDestroy() {
    this.chats$.unsubscribe();
  }
}
