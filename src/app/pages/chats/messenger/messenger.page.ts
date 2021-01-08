import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";

import { NavController, IonContent } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";
import { ActivatedRoute, ParamMap } from "@angular/router";

import { BehaviorSubject, Subscription } from "rxjs";
import { map } from "rxjs/operators";

import { Chat, Message } from "@classes/index";
import { ChatStore } from "@stores/chat-store/chat-store.service";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [],
})
export class MessengerPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) ionContent: IonContent;

  // Constants
  private SCROLL_SPEED: number = 100;
  private CHAT_ID: string;

  // Storing latest chat input functionality
  public latestChatInput: string;

  // Scroll functionality
  private scroll$: Subscription;
  private timeOfNewestMsg: Date;

  private chats$: Subscription;
  public currentChat = new BehaviorSubject<Chat>(null);

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private chatStore: ChatStore,
    private afauth: AngularFireAuth
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((param) => this.messengerInitHandler(param));
    this.timeOfNewestMsg = this.lastInteracted();
    this.scroll$ = this.currentChat.subscribe((c) => this.scrollHandler(c));
  }

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   * We assume a change in the time of the newest message means a new message appeared.
   */
  private scrollHandler(chat: Chat) {
    if (!chat?.messages) return;

    if (this.lastInteracted() > this.timeOfNewestMsg) {
      this.timeOfNewestMsg = this.lastInteracted();
      setTimeout(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED), 100);
    }
  }

  /** Called in html, teleports to bottom of page when content is rendered */
  fastScroll() {
    this.ionContent?.scrollToBottom(0);
  }

  /** Returns the time of the newest message */
  private lastInteracted(): Date {
    const chat = this.currentChat.getValue();
    if (!chat) return;
    return new Date(
      Math.max.apply(
        null,
        chat.messages.map((msg) => msg.time)
      )
    );
  }

  /** Subscribes to chatStore to get chat information & scroll speed */
  private messengerInitHandler(parameter: ParamMap) {
    if (!parameter.has("chatID"))
      return this.navCtrl.navigateBack("/tabs/chats");
    this.CHAT_ID = parameter.get("chatID");

    this.chats$ = this.chatStore.chats
      .pipe(
        map((chats) => {
          chats.forEach((chat) => {
            if (chat.id === this.CHAT_ID) {
              this.currentChat.next(chat);
              if (!this.latestChatInput) {
                this.latestChatInput = chat.latestChatInput;
              }
            }
          });
        })
      )
      .subscribe();
  }

  /** Updates Chats object of chatStore,
   * subsequently updates chat on database */
  async sendMessage(): Promise<void> {
    const messageContent: string = this.latestChatInput;

    if (!messageContent) return;

    const chat: Chat = this.currentChat.getValue();
    if (!chat) return console.error("Chat object is empty");

    const user = await this.afauth.currentUser;
    if (!user) return console.error("User isn't logged in.");

    // Setting message state to "sending"
    const newMessage: Message = new Message(
      user.uid,
      new Date(),
      messageContent,
      null,
      false,
      "sending"
    );

    this.chatStore.localMessageAddition(newMessage, chat.id);
    this.latestChatInput = "";

    try {
      await this.chatStore.databaseUpdateMessages(chat);
    } catch (e) {
      console.error(`Message to ${chat.recipient.name} failed to send: ${e}`);
      // Setting message state to "failed"
      this.chatStore.updateMessageState(chat, newMessage, "failed");
    }
    // Setting message state to "sent"
    this.chatStore.updateMessageState(chat, newMessage, "sent");
  }

  /** Makes an attempt to change db version of chat's messages from local version */
  async retryUpdateMessage(message: Message) {
    if (!message || message.state !== "failed") return;

    const chat: Chat = this.currentChat.getValue();
    if (!chat) return console.error("Chat object is empty");

    try {
      await this.chatStore.databaseUpdateMessages(chat);
      this.chatStore.updateMessageState(chat, message, "sent");
    } catch (e) {
      console.error(`Message to ${chat.recipient.name} failed to send: ${e}`);
    }
  }

  ngOnDestroy() {
    this.chatStore.updateLatestChatInput(
      this.currentChat.getValue(),
      this.latestChatInput
    );

    this.chats$.unsubscribe();
    this.scroll$.unsubscribe();
  }
}
