import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";

import { NavController, IonContent } from "@ionic/angular";
import { ActivatedRoute } from "@angular/router";
import { Keyboard } from "@ionic-native/keyboard/ngx";

import { BehaviorSubject, Subscription } from "rxjs";
import { map } from "rxjs/operators";
// import { AutosizeModule } from "ngx-autosize";

import { Chat } from "@classes/index";
import { ChatStore } from "@stores/chat-store/chat-store.service";
import { Message } from "@angular/compiler/src/i18n/i18n_ast";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [Keyboard],
})
export class MessengerPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) ionContent: IonContent;

  private scrollSpeed: number;
  public nextMessageSender: string;

  private chats$: Subscription;
  private chatID: string;
  public currentChat = new BehaviorSubject<Chat>(null);
  searching: any;

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
                this.currentChat.next(chat);
                this.scrollSpeed = chat.messages.length;
                //this.currentChat.getValue().messages[0].
              }
            });
          })
        )
        .subscribe();
    });
  }

  ionViewWillEnter() {
    this.ionContent.scrollToBottom(100);
  }

  ionViewDidEnter() {
    this.keyboard.show();
  }

  ngOnDestroy() {
    console.log(this.nextMessageSender);
    this.chats$.unsubscribe();
  }

  closeKeyboard(event) {
    this.keyboard.hide();
  }

  onSend(event) {
    console.log(event);
  }
}
