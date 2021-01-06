import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";

import { NavController, IonContent } from "@ionic/angular";
import { ActivatedRoute } from "@angular/router";
import { Keyboard } from "@ionic-native/keyboard/ngx";

import { BehaviorSubject, Subscription } from "rxjs";
import { map } from "rxjs/operators";
// import { AutosizeModule } from "ngx-autosize";

import { Chat, Message } from "@classes/index";
import { ChatStore } from "@stores/chat-store/chat-store.service";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [Keyboard],
})
export class MessengerPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) ionContent: IonContent;

  //NOT IN USE YET, what are their point? (Archi)
  public nextMessageSender: string;
  searching: any;
  private scrollSpeed: number;

  private chats$: Subscription;
  private chatID: string;
  public currentChat = new BehaviorSubject<Chat>(null);

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
    // I don't think the keyboard should show up on entering the chat (Archi)
    this.keyboard.show();
  }

  ngOnDestroy() {
    console.log("ngondestroy", this.nextMessageSender);
    this.chats$.unsubscribe();
  }

  closeKeyboard(event) {
    this.keyboard.hide();
  }

  onSend(event) {
    console.log("onSend:", event);
  }
}
